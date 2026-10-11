<?php
declare(strict_types=1);
require_once __DIR__.'/database-backup-lib.php';

function spResetSelection(array $input): array {
    $out=[];foreach(['products','customers','documents'] as $key){if(!isset($input[$key])||!is_bool($input[$key]))throw new InvalidArgumentException('Select Products, Customers or Documents.');$out[$key]=$input[$key];}
    if(!in_array(true,$out,true))throw new InvalidArgumentException('Select at least one entity.');return $out;
}
/** Every deletion is explicit. Incoming references are checked even for SET NULL / CASCADE. */
function spResetPlan(PDO $pdo,array $snapshot,int $outlet,array $selected): array {
    $tables=$snapshot['tables'];$delete=[];$updates=[];$blocked=[];
    $roots=[];
    if($selected['documents'])$roots=array_merge($roots,['sales','invoices','quotations','purchases','open_orders','sale_refunds','sale_voids','document_payments','payments','receipts','maintenance','warranties','stock_movements','cash_movements','end_of_day','register_sessions','display_events']);
    if($selected['products'])$roots=array_merge($roots,['open_orders','promotions','discount_rules','tax_rates','product_prices']);
    if($selected['customers'])$roots=array_merge($roots,['customers','suppliers','customer_vehicles','loyalty_accounts']);
    foreach(array_unique($roots) as $table){
        if(!isset($tables[$table])||!in_array('outlet_id',$tables[$table]['columns'],true)||!in_array('id',$tables[$table]['columns'],true))throw new RuntimeException('Reset schema is incomplete: '.$table);
        foreach($tables[$table]['rows'] as $row)if((int)($row['outlet_id']??0)===$outlet)$delete[$table][(int)$row['id']]=$row;
    }
    $allowedChildren=['sale_items','sale_payments','sale_status_history','sale_refund_items','purchase_items','invoice_items','quotation_items','open_order_items','pos_order_context','maintenance_records','warranty_claims','loyalty_transactions','customer_notes','customer_vehicles'];
    if($selected['documents'])$allowedChildren=array_merge($allowedChildren,$roots);
    // Known application references are checked in addition to physical foreign keys.
    $parents=['sale_id'=>'sales','original_sale_id'=>'sales','sale_item_id'=>'sale_items','refund_id'=>'sale_refunds','purchase_id'=>'purchases','invoice_id'=>'invoices','quotation_id'=>'quotations','open_order_id'=>'open_orders','maintenance_id'=>'maintenance','warranty_id'=>'warranties','customer_id'=>'customers','supplier_id'=>'suppliers','loyalty_account_id'=>'loyalty_accounts','register_session_id'=>'register_sessions'];
    $edges=[];
    foreach($tables as $table=>$data)foreach($data['columns'] as $col)if(isset($parents[$col]))$edges[$table.'|'.$col.'|'.$parents[$col]]=[$table,$col,$parents[$col],'id'];
    foreach($pdo->query("SELECT TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL")->fetchAll() as $fk){
        $edges[$fk['TABLE_NAME'].'|'.$fk['COLUMN_NAME'].'|'.$fk['REFERENCED_TABLE_NAME']]=[$fk['TABLE_NAME'],$fk['COLUMN_NAME'],$fk['REFERENCED_TABLE_NAME'],$fk['REFERENCED_COLUMN_NAME']];
    }
    do{
        $changed=false;
        foreach($edges as [$child,$column,$parent,$parentCol]){
            if(empty($delete[$parent]))continue;
            $values=array_fill_keys(array_map(fn($r)=>(string)$r[$parentCol],$delete[$parent]),true);
            foreach($tables[$child]['rows'] as $row){
                if($row[$column]===null||!isset($values[(string)$row[$column]]))continue;
                $id=(int)($row['id']??0);if($id&&isset($delete[$child][$id]))continue;
                if(!$id||!in_array($child,$allowedChildren,true)||(isset($row['outlet_id'])&&(int)$row['outlet_id']!==$outlet)){$blocked[$child.'|'.$parent]='Retained '.$child.' records reference '.$parent.'. Select Documents where applicable; cross-outlet references must be resolved first.';continue;}
                $delete[$child][$id]=$row;$changed=true;
            }
        }
    }while($changed);
    // Re-evaluate blockers after the graph has expanded.
    $blocked=[];
    foreach($edges as [$child,$column,$parent,$parentCol])if(!empty($delete[$parent])){
        $values=array_fill_keys(array_map(fn($r)=>(string)$r[$parentCol],$delete[$parent]),true);
        foreach($tables[$child]['rows'] as $row)if($row[$column]!==null&&isset($values[(string)$row[$column]])&&!isset($delete[$child][(int)($row['id']??0)]))$blocked[$child.'|'.$parent]='Retained '.$child.' records reference '.$parent.'. Select Documents where applicable; cross-outlet references must be resolved first.';
    }
    if($selected['documents']||$selected['products']){
        foreach($tables['product_outlets']['rows'] as $r)if((int)$r['outlet_id']===$outlet)$updates['product_outlets'][(int)$r['id']]=['before'=>$r,'values'=>$selected['products']?['stock_qty'=>0,'active'=>0]:['stock_qty'=>0]];
    }
    if($selected['documents']&&!$selected['customers']){
        foreach($tables['loyalty_accounts']['rows'] as $r)if((int)$r['outlet_id']===$outlet){
            foreach($tables['loyalty_transactions']['rows'] as $tx)if((int)$tx['loyalty_account_id']===(int)$r['id']&&!isset($delete['loyalty_transactions'][(int)$tx['id']]))$delete['loyalty_transactions'][(int)$tx['id']]=$tx;
            $updates['loyalty_accounts'][(int)$r['id']]=['before'=>$r,'values'=>['points_balance'=>0,'visits'=>0,'total_spend'=>0]];
        }
        foreach($tables['customers']['rows'] as $r)if((int)($r['outlet_id']??0)===$outlet)$updates['customers'][(int)$r['id']]=['before'=>$r,'values'=>['loyalty_points'=>0,'visits'=>0,'spend'=>0]];
    }
    $keys=[];
    if($selected['documents'])$keys=array_merge($keys,['sales','purchases','orders','stockHistory','cashMovements','zReports']);
    if($selected['products'])$keys=array_merge($keys,['products','promos','orders']);
    if($selected['customers'])$keys=array_merge($keys,['customers','suppliers']);
    $keys=array_values(array_unique($keys));
    foreach(['sp_app_state','sp_relational_sync'] as $table)foreach($tables[$table]['rows'] as $r)if((int)$r['outlet_id']===$outlet&&in_array($r['state_key'],$keys,true))$delete[$table][(int)$r['id']]=$r;
    foreach($tables['sync_queue']['rows'] as $r)if((int)$r['outlet_id']===$outlet){
        // Pending writes must never resurrect the pre-reset outlet state.
        if(!in_array(strtoupper((string)$r['status']),['COMPLETED','DONE'],true))$blocked['sync_queue']='Resolve pending sync_queue entries for this outlet before resetting.';
    }
    if($selected['documents']){
        foreach(['document_counters'=>'document_type','sp_document_counters'=>'doc_type'] as $table=>$col)foreach($tables[$table]['rows'] as $r)if((int)$r['outlet_id']===$outlet&&in_array(strtolower((string)$r[$col]),['invoice','sale','quotation','order','purchase','refund','receipt','warranty','maintenance','zreport'],true)){
            if($table==='document_counters')$updates[$table][(int)$r['id']]=['before'=>$r,'values'=>['next_number'=>1]];
            else $updates[$table][(string)$r[$col]]=['before'=>$r,'values'=>['current_number'=>0]];
        }
        foreach(['customer_displays','customer_display_sessions'] as $table)foreach($tables[$table]['rows'] as $r)if((int)$r['outlet_id']===$outlet)$updates[$table][(int)$r['id']]=['before'=>$r,'values'=>['state'=>'IDLE','state_json'=>'{}']];
    }
    $settingKeys=[];if($selected['documents'])$settingKeys[]='businessDay';if($selected['products'])$settingKeys[]='taxRate';
    foreach(['sp_settings','outlet_settings'] as $table)foreach($tables[$table]['rows'] as $r)if((int)$r['outlet_id']===$outlet&&in_array($r['setting_key'],$settingKeys,true)&&(!isset($r['setting_group'])||$r['setting_group']==='SP-MANAGER'))$delete[$table][(int)$r['id']]=$r;
    $foreignOwners=[];$childEdges=[];
    foreach($edges as [$child,$col,$parent,$parentCol])if(!in_array($parent,['products','users','outlets','roles'],true)){
        $index=$parent.'|'.$parentCol;$childEdges[$child][]=[$col,$index];
        if(!isset($foreignOwners[$index])){$foreignOwners[$index]=[];foreach($tables[$parent]['rows'] as $owner)if(isset($owner['outlet_id'])&&(int)$owner['outlet_id']!==$outlet)$foreignOwners[$index][(string)$owner[$parentCol]]=true;}
    }
    foreach($delete as $table=>$rows)foreach($rows as $row)foreach($childEdges[$table]??[] as [$col,$index])if(isset($row[$col])&&isset($foreignOwners[$index][(string)$row[$col]]))$blocked['cross-outlet']='A selected record is linked to another outlet. Resolve cross-outlet references before resetting.';
    ksort($delete);ksort($updates);foreach($delete as &$rows)ksort($rows);unset($rows);foreach($updates as &$rows)ksort($rows);unset($rows);
    $order=[];$pending=array_fill_keys(array_keys($delete),true);
    while($pending){$progress=false;foreach(array_keys($pending) as $table){$hasChild=false;foreach($edges as [$child,,$parent])if($parent===$table&&$child!==$table&&isset($pending[$child]))$hasChild=true;if(!$hasChild){$order[]=$table;unset($pending[$table]);$progress=true;}}if(!$progress){$blocked['cycle']='Cyclic document references require manual review.';break;}}
    $counts=array_map('count',$delete);$updateCounts=array_map('count',$updates);
    $fingerprint=hash('sha256',json_encode([$outlet,$selected,$delete,$updates,$blocked],JSON_THROW_ON_ERROR));
    return compact('delete','updates','order','counts','updateCounts','keys','fingerprint')+['blockers'=>array_values($blocked)];
}
function spResetApply(PDO $pdo,array $plan,int $outlet): void {
    if(!$pdo->inTransaction()||$plan['blockers'])throw new RuntimeException('Reset plan is blocked.');
    foreach($plan['order'] as $table)foreach(array_chunk(array_keys($plan['delete'][$table]),500) as $ids){$q=$pdo->prepare('DELETE FROM '.spBackupIdent($table).' WHERE id IN ('.implode(',',array_fill(0,count($ids),'?')).')');$q->execute($ids);}
    foreach($plan['updates'] as $table=>$rows)foreach($rows as $entry){$values=$entry['values'];$set=implode(',',array_map(fn($c)=>spBackupIdent($c).'=?',array_keys($values)));$params=array_values($values);
        if($table==='sp_document_counters'){$where='outlet_id=? AND doc_type=?';$params[]=$outlet;$params[]=$entry['before']['doc_type'];}else{$where='id=?';$params[]=$entry['before']['id'];}
        $pdo->prepare('UPDATE '.spBackupIdent($table).' SET '.$set.' WHERE '.$where)->execute($params);
    }
}
