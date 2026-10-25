<?php
declare(strict_types=1);
final class ReportingError extends RuntimeException {
    public function __construct(string $message, public readonly int $status=400) { parent::__construct($message); }
}
function rpMoney(mixed $value): int {
    if(!preg_match('/^(-?)(\d+)(?:\.(\d+))?$/',(string)($value??'0'),$m))throw new ReportingError('Invalid recorded amount.',422);
    $f=str_pad($m[3]??'',3,'0');$v=(int)$m[2]*100+(int)substr($f,0,2)+((int)$f[2]>=5?1:0);return $m[1]==='-'?-$v:$v;
}
function rpDecimal(int $v): string {return ($v<0?'-':'').intdiv(abs($v),100).'.'.str_pad((string)(abs($v)%100),2,'0',STR_PAD_LEFT);}
function rpMulDiv(int $a,int $b,int $d): array {
    if($a===0||$b===0)return [0,0];
    if($a<=intdiv(PHP_INT_MAX,$b)){$p=$a*$b;return [intdiv($p,$d),$p%$d];}
    // Allocation weights never exceed their sum. Binary long division avoids float overflow.
    $q=0;$r=0;$aq=intdiv($a,$d);$ar=$a%$d;
    foreach(str_split(decbin($b)) as $bit){$q*=2;$r*=2;if($r>=$d){$q++;$r-=$d;}if($bit==='1'){$q+=$aq;$r+=$ar;if($r>=$d){$q++;$r-=$d;}}}
    return [$q,$r];
}
function rpAllocate(int $amount,array $weights): array {
    if(!$weights)return [];$sum=array_sum($weights);$out=array_fill(0,count($weights),0);
    if(!is_int($sum)||$sum>intdiv(PHP_INT_MAX,2))throw new ReportingError('Recorded document values exceed the supported integer range.',422);
    if($sum<=0){$out[0]=$amount;return $out;}
    $left=abs($amount);$rem=[];foreach($weights as $k=>$w){[$out[$k],$rem[$k]]=rpMulDiv(abs($amount),$w,$sum);$left-=$out[$k];}
    arsort($rem,SORT_NUMERIC);foreach($rem as $k=>$_){if($left--<=0)break;$out[$k]++;}
    foreach($out as &$v)$v*=$amount<0?-1:1;unset($v);return $out;
}
function rpDate(string $v): string {$d=DateTimeImmutable::createFromFormat('!Y-m-d',$v);if(!$d||$d->format('Y-m-d')!==$v)throw new ReportingError('Invalid report date.');return $v;}
function rpId(mixed $v): ?int {if($v===null||$v==='')return null;if(!is_scalar($v)||!preg_match('/^[1-9][0-9]{0,17}$/',(string)$v))throw new ReportingError('Invalid report filter.');return(int)$v;}
function rpRows(PDO $db,string $sql,array $args=[]): array {$q=$db->prepare($sql);$q->execute($args);$out=[];while($r=$q->fetch(PDO::FETCH_ASSOC)){if(count($out)>=50000)throw new ReportingError('More than 50,000 source rows. Choose a shorter period.',422);$out[]=$r;}return $out;}
function rpJson(mixed $v): array {$x=json_decode((string)($v??''),true);return is_array($x)?$x:[];}
function rpCatalog(): array {
    $groups=[
        'Sales'=>['products'=>'Products','product-groups'=>'Product groups','customers'=>'Customers','tax-rates'=>'Tax rates','users'=>'Users','item-list'=>'Item list','payment-types'=>'Payment types','payment-types-users'=>'Payment types by users','payment-types-customers'=>'Payment types by customers','refunds'=>'Refunds','invoice-list'=>'Invoice list','daily'=>'Daily sales','hourly'=>'Hourly sales','hourly-product-groups'=>'Hourly sales by product groups','order-number'=>'Table or order number','profit'=>'Profit & margin','unpaid'=>'Unpaid sales','starting-cash'=>'Starting cash entries','voided-items'=>'Voided items','credit-payments'=>'Collected credit payments','discounts'=>'Discounts granted','item-discounts'=>'Items discounts','stock-movement'=>'Stock movement'],
        'Purchase'=>['products'=>'Products','suppliers'=>'Suppliers','payment-types'=>'Payment types','payment-types-suppliers'=>'Payment types by supplier','unpaid'=>'Unpaid purchase','discounts'=>'Purchase discounts','item-discounts'=>'Purchased items discounts','invoice-list'=>'Purchase invoice list','tax-rates'=>'Tax rates','expiration-date'=>'Expiration date'],
        'Stock return'=>['products'=>'Products'],'Loss and damage'=>['products'=>'Products'],'Finance'=>['transactions'=>'Transaction history'],'Stock control'=>['reorder'=>'Reorder product list','low-stock'=>'Low stock warning']
    ];$out=[];foreach($groups as $category=>$reports)foreach($reports as $key=>$title){
        $prefix=match($category){'Sales'=>'sales','Purchase'=>'purchase','Stock return'=>'stock-return','Loss and damage'=>'loss-damage','Finance'=>'finance',default=>'stock-control'};
        $filters=match($prefix){'sales'=>['customer','user','product','group'],'purchase'=>['supplier','user','product','group'],'finance'=>['customer','user'],'stock-control'=>['product','group'],default=>['user','product','group']};
        if($key==='starting-cash')$filters=['user','terminal'];if($key==='credit-payments')$filters=['customer','user'];
        $out[]=['id'=>$prefix.'-'.$key,'category'=>$category,'title'=>$title,'filters'=>$filters,'period'=>$prefix!=='stock-control'];
    }return $out;
}
final class ReportingEngine {
    private array $cache=[];public array $warnings=[];public readonly string $start;public readonly string $end;private array $filter;
    public function __construct(private PDO $db,public readonly int $outlet,array $input){
        foreach($input as $value)if($value!==null&&!is_scalar($value))throw new ReportingError('Invalid report parameter.');
        $this->start=rpDate((string)($input['start']??date('Y-m-01')));$last=rpDate((string)($input['end']??date('Y-m-d')));
        if($last<$this->start)throw new ReportingError('End date must follow start date.');
        if((new DateTimeImmutable($this->start))->diff(new DateTimeImmutable($last))->days>3660)throw new ReportingError('Choose a period of ten years or less.');
        $this->end=(new DateTimeImmutable($last))->modify('+1 day')->format('Y-m-d');$this->filter=[];
        foreach(['customer','supplier','user','product','group','terminal'] as $k)$this->filter[$k]=rpId($input[$k]??null);
        $this->filter['include_subgroups']=($input['include_subgroups']??'1')==='1';
    }
    public function warning(string $v): void {$this->warnings[$v]=$v;}
    private function rows(string $key,string $sql,array $args=[]): array {return $this->cache[$key]??=rpRows($this->db,$sql,$args);}
    public function options(): array {
        $o=$this->outlet;$m=spMasterOutletId($this->db);return [
            'customers'=>$this->rows('customers','SELECT c.id,c.name FROM customers c WHERE c.outlet_id=? OR c.outlet_id IS NULL OR EXISTS(SELECT 1 FROM sales s WHERE s.customer_id=c.id AND s.outlet_id=?) ORDER BY c.name',[$o,$o]),
            'suppliers'=>$this->rows('suppliers','SELECT p.id,p.supplier_name AS name FROM suppliers p WHERE p.outlet_id=? OR p.outlet_id IS NULL OR EXISTS(SELECT 1 FROM purchases x WHERE x.supplier_id=p.id AND x.outlet_id=?) ORDER BY p.supplier_name',[$o,$o]),
            'users'=>$this->rows('users','SELECT u.id,u.name FROM users u WHERE u.outlet_id=? OR EXISTS(SELECT 1 FROM user_outlets x WHERE x.user_id=u.id AND x.outlet_id=? AND x.active=1) OR EXISTS(SELECT 1 FROM sales s WHERE s.created_by=u.id AND s.outlet_id=?) ORDER BY u.name',[$o,$o,$o]),
            'products'=>$this->rows('products','SELECT p.id,p.product_name AS name,p.group_id FROM products p JOIN product_outlets po ON po.product_id=p.id WHERE po.outlet_id=? ORDER BY p.product_name',[$o]),
            'groups'=>$this->rows('groups','SELECT id,group_name AS name,parent_id FROM product_groups WHERE outlet_id IN (?,?) OR outlet_id IS NULL ORDER BY group_name',[$o,$m]),
            'terminals'=>$this->rows('terminals','SELECT id,terminal_name AS name FROM terminals WHERE outlet_id=? ORDER BY terminal_name',[$o])
        ];
    }
    private function groupIds(): array {
        if(!$this->filter['group'])return [];if(isset($this->cache['groupIds']))return $this->cache['groupIds'];$ids=[$this->filter['group']];
        if($this->filter['include_subgroups']){do{$n=count($ids);foreach($this->options()['groups'] as $g)if(in_array((int)$g['parent_id'],$ids,true)&&!in_array((int)$g['id'],$ids,true))$ids[]=(int)$g['id'];}while(count($ids)>$n);}
        return $this->cache['groupIds']=$ids;
    }
    private function matches(array $r,bool $purchase=false): bool {
        foreach(['user'=>'created_by','product'=>'product_id'] as $f=>$c)if($this->filter[$f]&&(int)($r[$c]??0)!==$this->filter[$f])return false;
        $p=$purchase?'supplier':'customer';if($this->filter[$p]&&(int)($r[$p.'_id']??0)!==$this->filter[$p])return false;
        $ids=$this->groupIds();return !$ids||in_array((int)($r['group_id']??0),$ids,true);
    }
    private function documents(bool $purchase=false,bool $all=false,bool $history=false): array {
        $t=$purchase?'purchases':'sales';$d=$purchase?'purchase_date':'sale_date';$p=$purchase?'supplier':'customer';
        $rows=$this->rows($t.($history?'-history':''),"SELECT d.*,p.".($purchase?'supplier_name':'name')." AS party_name,u.name AS user_name FROM $t d LEFT JOIN ".($purchase?'suppliers':'customers')." p ON p.id=d.{$p}_id LEFT JOIN users u ON u.id=d.created_by WHERE d.outlet_id=?".($history?'':" AND d.$d>=? AND d.$d<?")." ORDER BY d.$d,d.id",$history?[$this->outlet]:[$this->outlet,$this->start,$this->end]);
        return array_values(array_filter($rows,function($r)use($purchase,$all){if(!$all&&in_array(strtoupper($r['status']),['VOID','VOIDED','CANCELLED','CANCELED'],true))return false;if($this->filter['user']&&(int)$r['created_by']!==$this->filter['user'])return false;$p=$purchase?'supplier':'customer';return !$this->filter[$p]||(int)$r[$p.'_id']===$this->filter[$p];}));
    }
    private function facts(bool $purchase=false,bool $all=false,bool $history=false): array {
        $key=($purchase?'purchase':'sale').($all?'-all':'').($history?'-history':'').'-facts';if(isset($this->cache[$key]))return $this->cache[$key];
        $t=$purchase?'purchase_items':'sale_items';$p=$purchase?'purchases':'sales';$fk=$purchase?'purchase_id':'sale_id';$d=$purchase?'purchase_date':'sale_date';
        $items=$this->rows($t.($history?'-history':''),"SELECT i.*,p.product_name AS current_name,p.sku,p.group_id,g.group_name FROM $t i JOIN $p d ON d.id=i.$fk LEFT JOIN products p ON p.id=i.product_id LEFT JOIN product_groups g ON g.id=p.group_id WHERE d.outlet_id=?".($history?'':" AND d.$d>=? AND d.$d<?")." ORDER BY d.id,i.id",$history?[$this->outlet]:[$this->outlet,$this->start,$this->end]);
        $by=[];foreach($items as $i)$by[(int)$i[$fk]][]=$i;$out=[];
        foreach($this->documents($purchase,$all,$history) as $doc){$lines=$by[(int)$doc['id']]??[];if(!$lines){$this->warning('Some documents have no item rows; item reports cannot include their totals.');continue;}
            $weights=array_map(fn($i)=>max(0,rpMoney($i[$purchase?'total':'line_total'])),$lines);$gross=rpAllocate(rpMoney($doc['total']),$weights);$tax=rpAllocate(rpMoney($doc['tax']),$weights);$disc=rpAllocate(rpMoney($doc['discount']),$weights);
            foreach($lines as $n=>$i){$meta=$purchase?rpJson($i['data_json']??null):[];
                $r=['document_id'=>(int)$doc['id'],'number'=>$doc[$purchase?'purchase_no':'sale_no'],'date'=>$doc[$d],'customer_id'=>$doc['customer_id']??null,'supplier_id'=>$doc['supplier_id']??null,'party_name'=>$doc['party_name']?:($purchase?'Unknown supplier':'Walk-in'),'created_by'=>$doc['created_by'],'user_name'=>$doc['user_name']?:'Unassigned','product_id'=>$i['product_id'],'product_name'=>$i['product_name']??$i['current_name']??'Unknown product','sku'=>$i['sku']??'','group_id'=>$i['group_id'],'group_name'=>$i['group_name']?:'Ungrouped','quantity'=>(float)$i['quantity'],'gross'=>$gross[$n],'tax'=>$tax[$n],'net'=>$gross[$n]-$tax[$n],'discount'=>$disc[$n],'item_discount'=>$purchase?(isset($meta['discountAmount'])?rpMoney($meta['discountAmount']):(isset($meta['discount'])?rpMoney($meta['discount']):null)):rpMoney($i['discount']),'cost'=>$purchase?rpMoney($i['total']):($i['cost_snapshot']===null?null:(int)round((float)$i['quantity']*rpMoney($i['cost_snapshot']),0,PHP_ROUND_HALF_UP)),'status'=>$doc['status'],'order_number'=>$doc['order_name']??'','metadata'=>$meta];
                if($this->matches($r,$purchase))$out[]=$r;
            }
        }return $this->cache[$key]=$out;
    }
    private function docMatches(int $id,bool $purchase=false): bool {
        if(!$this->filter['product']&&!$this->filter['group'])return true;
        $key=$purchase?'matchingPurchases':'matchingSales';if(!isset($this->cache[$key]))$this->cache[$key]=array_fill_keys(array_column($this->facts($purchase,true),'document_id'),true);return isset($this->cache[$key][$id]);
    }
    private function aggregate(array $facts,array $keys,array $metrics): array {
        $out=[];foreach($facts as $f){$key=json_encode(array_map(fn($k)=>$f[$k]??null,$keys));if(!isset($out[$key])){$out[$key]=array_intersect_key($f,array_flip($keys));foreach($metrics as $m)$out[$key][$m]=0;$out[$key]['unknown']=[];}
            foreach($metrics as $m){if(($f[$m]??null)===null)$out[$key]['unknown'][$m]=true;else $out[$key][$m]+=$f[$m];}}
        foreach($out as &$r){foreach($r['unknown'] as $k=>$_)$r[$k]=null;unset($r['unknown']);}unset($r);return array_values($out);
    }
    private function salesPayments(bool $event=false): array {
        $date=$event?'p.created_at':'s.sale_date';$rows=$this->rows('payments-'.(int)$event,"SELECT p.*,s.sale_date,s.status,s.customer_id,s.created_by,s.sale_no AS number,c.name AS party_name,u.name AS user_name FROM sale_payments p JOIN sales s ON s.id=p.sale_id LEFT JOIN customers c ON c.id=s.customer_id LEFT JOIN users u ON u.id=s.created_by WHERE s.outlet_id=? AND $date>=? AND $date<? ORDER BY p.created_at,p.id",[$this->outlet,$this->start,$this->end]);$out=[];
        foreach($rows as $r){if(in_array(strtoupper($r['status']),['VOID','VOIDED','CANCELLED','CANCELED'],true))continue;
            if($this->filter['user']&&(int)$r['created_by']!==$this->filter['user'])continue;if($this->filter['customer']&&(int)$r['customer_id']!==$this->filter['customer'])continue;if(!$this->docMatches((int)$r['sale_id']))continue;
            if(in_array(strtoupper($r['status']),['REFUND','REFUNDED'],true))$this->warning('Refunds have no recorded tender split. Original receipt amounts are retained; refund payments are not assigned to a guessed method.');
            $out[]=['document_id'=>(int)$r['sale_id'],'customer_id'=>$r['customer_id'],'created_by'=>$r['created_by'],'date'=>$r['created_at'],'number'=>$r['number'],'party_name'=>$r['party_name']?:'Walk-in','user_name'=>$r['user_name']?:'Unassigned','payment_type'=>$r['payment_type_name'],'amount'=>rpMoney($r['amount']),'reference'=>$r['reference_no']??''];
        }return $out;
    }
    private function purchasePayments(): array {
        if(isset($this->cache['purchasePayments']))return $this->cache['purchasePayments'];$out=[];
        foreach($this->documents(true) as $d){if(!$this->docMatches((int)$d['id'],true))continue;$meta=rpJson($d['data_json']);$pays=$meta['payments']??null;
            if(!is_array($pays)){$paid=$meta['paymentAmount']??$meta['paidAmount']??null;if($paid===null&&($meta['paid']??null)===true)$paid=$d['total'];if($paid===null){$this->warning('Some purchases have no recorded payment metadata; their paid/unpaid amounts are unknown.');continue;}$pays=[['amount'=>$paid,'payment'=>$meta['paymentType']??'Recorded payment']];}
            foreach($pays as $p){if(is_array($p))$out[]=['document_id'=>(int)$d['id'],'supplier_id'=>$d['supplier_id'],'created_by'=>$d['created_by'],'date'=>$d['purchase_date'],'number'=>$d['purchase_no'],'party_name'=>$d['party_name']?:'Unknown supplier','user_name'=>$d['user_name']?:'Unassigned','payment_type'=>(string)($p['payment']??$p['name']??'Recorded payment'),'amount'=>rpMoney($p['amount']??0),'reference'=>$p['referenceNo']??''];}
        }return $this->cache['purchasePayments']=$out;
    }
    private function balance(array $doc,bool $purchase): ?int {
        if(!$purchase&&in_array(strtoupper($doc['status']),['REFUND','REFUNDED'],true))return 0;
        if(!$purchase){$rows=$this->rows('all-balances','SELECT p.sale_id,SUM(p.amount) AS paid FROM sale_payments p JOIN sales s ON s.id=p.sale_id WHERE s.outlet_id=? GROUP BY p.sale_id',[$this->outlet]);$paid=0;foreach($rows as $r)if($r['sale_id']==$doc['id'])$paid=rpMoney($r['paid']);}
        else{$meta=rpJson($doc['data_json']);if(($meta['paid']??null)===false&&empty($meta['payments'])&&!isset($meta['paymentAmount'])&&!isset($meta['paidAmount']))return rpMoney($doc['total']);$paid=0;$known=false;foreach($this->purchasePayments() as $p)if($p['document_id']==$doc['id']){$paid+=$p['amount'];$known=true;}if(!$known)return null;}
        return max(0,rpMoney($doc['total'])-$paid);
    }
    private function refundFacts(): array {
        if(isset($this->cache['refundFacts']))return $this->cache['refundFacts'];
        $parents=$this->rows('refundParents',"SELECT r.*,s.customer_id,s.tax AS original_tax,s.total AS original_total,c.name AS party_name,u.name AS user_name FROM sale_refunds r JOIN sales s ON s.id=r.original_sale_id AND s.outlet_id=r.outlet_id LEFT JOIN customers c ON c.id=s.customer_id LEFT JOIN users u ON u.id=r.created_by WHERE r.outlet_id=? AND r.refund_date>=? AND r.refund_date<? AND UPPER(r.status) NOT IN ('VOID','VOIDED','CANCELLED','CANCELED') ORDER BY r.refund_date,r.id",[$this->outlet,$this->start,$this->end]);
        $items=$this->rows('refundItems','SELECT ri.*,r.id AS parent_id,si.cost_snapshot,si.product_name,p.sku,p.group_id,g.group_name FROM sale_refund_items ri JOIN sale_refunds r ON r.id=ri.refund_id LEFT JOIN sale_items si ON si.id=ri.sale_item_id AND si.sale_id=r.original_sale_id LEFT JOIN products p ON p.id=ri.product_id LEFT JOIN product_groups g ON g.id=p.group_id WHERE r.outlet_id=? AND r.refund_date>=? AND r.refund_date<? ORDER BY r.id,ri.id',[$this->outlet,$this->start,$this->end]);
        $by=[];foreach($items as $item)$by[(int)$item['parent_id']][]=$item;$out=[];
        foreach($parents as $doc){
            $lines=$by[(int)$doc['id']]??[];
            if(!$lines){$lines=[['product_id'=>null,'product_name'=>'Refund without item detail','sku'=>'','group_id'=>null,'group_name'=>null,'quantity'=>'0','amount'=>$doc['amount'],'cost_snapshot'=>null]];$this->warning('Some refunds lack item detail. Their document amount is included but product attribution and cost are unknown.');}
            $weights=array_map(fn($line)=>max(0,rpMoney($line['amount'])),$lines);$gross=rpAllocate(-rpMoney($doc['amount']),$weights);
            $original=rpMoney($doc['original_total']);$taxTotal=$original>0?(int)round(rpMoney($doc['original_tax'])*rpMoney($doc['amount'])/$original,0,PHP_ROUND_HALF_UP):0;
            $tax=rpAllocate(-$taxTotal,$weights);
            foreach($lines as $n=>$line){$r=['document_id'=>'refund:'.$doc['id'],'number'=>$doc['refund_no'],'date'=>$doc['refund_date'],'customer_id'=>$doc['customer_id'],'supplier_id'=>null,'party_name'=>$doc['party_name']?:'Walk-in','created_by'=>$doc['created_by'],'user_name'=>$doc['user_name']?:'Unassigned','product_id'=>$line['product_id'],'product_name'=>$line['product_name']?:'Refunded product','sku'=>$line['sku']??'','group_id'=>$line['group_id'],'group_name'=>$line['group_name']?:'Ungrouped','quantity'=>-(float)$line['quantity'],'gross'=>$gross[$n],'tax'=>$tax[$n],'net'=>$gross[$n]-$tax[$n],'discount'=>0,'item_discount'=>0,'cost'=>$line['cost_snapshot']===null?null:-(int)round((float)$line['quantity']*rpMoney($line['cost_snapshot']),0,PHP_ROUND_HALF_UP),'status'=>'REFUND_RECORD','order_number'=>'','metadata'=>[]];if($this->matches($r))$out[]=$r;}
        }
        if($parents)$this->warning('Recorded refunds reduce sales on refund date. Refund tax is proportional to original recorded document tax because refund-specific tax rows are not stored; the recorded refund amount always reconciles. Refund discounts are not separately recorded.');
        return $this->cache['refundFacts']=$out;
    }
    private function eventReport(string $id): array {
        $rows=[];$columns=[];$money=[];$numbers=[];
        if($id==='sales-starting-cash'){
            $source=$this->rows('registers','SELECT r.*,t.terminal_name,u.name AS user_name FROM register_sessions r LEFT JOIN terminals t ON t.id=r.terminal_id AND t.outlet_id=r.outlet_id LEFT JOIN users u ON u.id=r.opened_by WHERE r.outlet_id=? AND r.opened_at>=? AND r.opened_at<? ORDER BY r.opened_at,r.id',[$this->outlet,$this->start,$this->end]);
            foreach($source as $r){if($this->filter['user']&&(int)$r['opened_by']!==$this->filter['user'])continue;if($this->filter['terminal']&&(int)$r['terminal_id']!==$this->filter['terminal'])continue;$rows[]=['date'=>$r['opened_at'],'terminal'=>$r['terminal_name']?:'Unassigned','user_name'=>$r['user_name']?:'Unassigned','amount'=>rpMoney($r['opening_cash'])];}
            $columns=['date'=>'Opened','terminal'=>'Cash register','user_name'=>'User','amount'=>'Starting cash'];$money=['amount'];
        }elseif($id==='sales-stock-movement'||str_starts_with($id,'stock-return-')||str_starts_with($id,'loss-damage-')){
            $source=$this->rows('movements','SELECT m.*,p.product_name,p.group_id,u.name AS user_name FROM stock_movements m LEFT JOIN products p ON p.id=m.product_id LEFT JOIN users u ON u.id=m.created_by WHERE m.outlet_id=? AND m.created_at>=? AND m.created_at<? ORDER BY m.created_at,m.id',[$this->outlet,$this->start,$this->end]);
            foreach($source as $r){if(!$this->matches($r))continue;$type=strtoupper(str_replace([' ','-'],'_',$r['movement_type']));
                $types=$id==='sales-stock-movement'?['SALE','SALE_REVERSAL','SALE_DELETE','REFUND','VOID']:(str_starts_with($id,'stock-return-')?['RETURN','STOCK_RETURN','PURCHASE_RETURN','RETURN_TO_SUPPLIER']:['LOSS','DAMAGE','LOSS_DAMAGE','LOSS_AND_DAMAGE']);
                if(!in_array($type,$types,true))continue;$rows[]=['date'=>$r['created_at'],'product_name'=>$r['product_name'],'type'=>$r['movement_type'],'quantity'=>(float)$r['quantity'],'before'=>(float)$r['stock_before'],'after'=>(float)$r['stock_after'],'reference'=>$r['reference_no'],'user_name'=>$r['user_name']?:'Unassigned'];}
            $columns=['date'=>'Date','product_name'=>'Product','type'=>'Type','quantity'=>'Quantity','before'=>'Stock before','after'=>'Stock after','reference'=>'Reference','user_name'=>'User'];$numbers=['quantity'];
        }elseif(str_starts_with($id,'stock-control-')){
            $source=$this->rows('stock','SELECT p.id AS product_id,p.product_name,p.sku,p.group_id,p.metadata_json,po.stock_qty,po.min_stock,po.preferred_quantity FROM product_outlets po JOIN products p ON p.id=po.product_id WHERE po.outlet_id=? AND po.active=1 AND p.is_service=0 ORDER BY p.product_name',[$this->outlet]);
            foreach($source as $r){$meta=rpJson($r['metadata_json']);$threshold=$id==='stock-control-low-stock'?(float)($meta['lowStockWarningQuantity']??$r['min_stock']):(float)$r['min_stock'];$enabled=$meta['lowStockWarning']??((float)$r['min_stock']>0);
                if(!$this->matches($r)||(float)$r['stock_qty']>$threshold)continue;if($id==='stock-control-low-stock'&&!$enabled)continue;if($id==='stock-control-reorder'&&((float)$r['preferred_quantity']===(float)$r['min_stock']||(float)$r['preferred_quantity']<=(float)$r['stock_qty']))continue;$rows[]=['sku'=>$r['sku'],'product_name'=>$r['product_name'],'stock'=>(float)$r['stock_qty'],'minimum'=>$threshold,'preferred'=>(float)$r['preferred_quantity'],'reorder'=>max(0,(float)$r['preferred_quantity']-(float)$r['stock_qty'])];}
            $columns=['sku'=>'Code','product_name'=>'Product','stock'=>'On hand','minimum'=>'Minimum','preferred'=>'Preferred','reorder'=>'Reorder quantity'];$numbers=['reorder'];$this->warning('Stock control is a current stock snapshot. The date period does not apply.');
        }elseif($id==='sales-refunds'){
            $source=$this->rows('refunds','SELECT r.*,s.sale_no,s.customer_id,c.name AS party_name,u.name AS user_name FROM sale_refunds r JOIN sales s ON s.id=r.original_sale_id AND s.outlet_id=r.outlet_id LEFT JOIN customers c ON c.id=s.customer_id LEFT JOIN users u ON u.id=r.created_by WHERE r.outlet_id=? AND r.refund_date>=? AND r.refund_date<? ORDER BY r.refund_date,r.id',[$this->outlet,$this->start,$this->end]);
            foreach($source as $r){if(in_array(strtoupper($r['status']),['VOID','VOIDED','CANCELLED'],true))continue;if($this->filter['user']&&(int)$r['created_by']!==$this->filter['user'])continue;if($this->filter['customer']&&(int)$r['customer_id']!==$this->filter['customer'])continue;
                if(($this->filter['product']||$this->filter['group'])){
                    $items=rpRows($this->db,'SELECT i.product_id,p.group_id FROM sale_refund_items i LEFT JOIN products p ON p.id=i.product_id WHERE i.refund_id=?',[$r['id']]);$match=false;
                    foreach($items as $i)if((!$this->filter['product']||(int)$i['product_id']===$this->filter['product'])&&(!$this->filter['group']||in_array((int)$i['group_id'],$this->groupIds(),true)))$match=true;if(!$match)continue;$this->warning('Refund lists show the full refund document amount when a selected item matches.');
                }
                $rows[]=['date'=>$r['refund_date'],'number'=>$r['refund_no'],'original'=>$r['sale_no'],'party_name'=>$r['party_name']?:'Walk-in','user_name'=>$r['user_name']?:'Unassigned','amount'=>rpMoney($r['amount']),'reason'=>$r['reason']];
            }$columns=['date'=>'Date','number'=>'Refund','original'=>'Original sale','party_name'=>'Customer','user_name'=>'User','amount'=>'Refund amount','reason'=>'Reason'];$money=['amount'];
        }elseif($id==='sales-credit-payments'){
            $source=$this->rows('collections',"SELECT p.*,i.invoice_no,c.name AS party_name,u.name AS user_name FROM document_payments p JOIN invoices i ON i.id=p.invoice_id AND i.outlet_id=p.outlet_id LEFT JOIN customers c ON c.id=p.customer_id LEFT JOIN users u ON u.id=p.created_by WHERE p.outlet_id=? AND p.paid_at>=? AND p.paid_at<? AND UPPER(i.status) NOT IN ('VOID','VOIDED','CANCELLED') ORDER BY p.paid_at,p.id",[$this->outlet,$this->start,$this->end]);
            foreach($source as $r){if(!$this->matches($r))continue;$rows[]=['date'=>$r['paid_at'],'number'=>$r['invoice_no'],'party_name'=>$r['party_name']?:'Walk-in','user_name'=>$r['user_name']?:'Unassigned','payment_type'=>$r['payment_type_name'],'amount'=>rpMoney($r['amount']),'reference'=>$r['reference_no']];}
            $columns=['date'=>'Payment date','number'=>'Invoice','party_name'=>'Customer','user_name'=>'User','payment_type'=>'Payment type','amount'=>'Collected','reference'=>'Reference'];$money=['amount'];
            $this->warning('Shows explicit invoice collection records by payment date. POS tenders are not guessed to be credit collections because no credit-collection marker is stored.');
        }else{
            foreach($this->salesPayments(true) as $r)$rows[]=[...$r,'type'=>'Sales receipt'];
            if(!$this->filter['customer']){
                $cash=$this->rows('cash','SELECT c.*,u.name AS user_name FROM cash_movements c LEFT JOIN users u ON u.id=c.created_by WHERE c.outlet_id=? AND c.created_at>=? AND c.created_at<? ORDER BY c.created_at,c.id',[$this->outlet,$this->start,$this->end]);
                foreach($cash as $r){if($this->filter['user']&&(int)$r['created_by']!==$this->filter['user'])continue;$sign=in_array(strtoupper($r['movement_type']),['OUT','CASH_OUT','WITHDRAWAL'],true)?-1:1;$rows[]=['date'=>$r['created_at'],'number'=>$r['reference_no'],'type'=>'Cash '.$r['movement_type'],'party_name'=>'','user_name'=>$r['user_name']?:'Unassigned','payment_type'=>'Cash','amount'=>$sign*rpMoney($r['amount']),'reference'=>$r['reason']];}
                foreach($this->purchasePayments() as $r)$rows[]=[...$r,'amount'=>-$r['amount'],'type'=>'Supplier payment'];
            }
            usort($rows,fn($a,$b)=>strcmp($a['date'],$b['date']));$columns=['date'=>'Date','number'=>'Document','type'=>'Transaction','party_name'=>'Customer / supplier','user_name'=>'User','payment_type'=>'Payment type','amount'=>'Net amount','reference'=>'Reference'];$money=['amount'];
            $this->warning('Finance combines canonical POS receipts, recorded supplier payments and cash movements. Separate invoice/deposit collections are shown in Collected credit payments, to avoid counting mirrored payments twice.');
        }
        return [$rows,$columns,$money,$numbers];
    }
    public function run(string $id): array {
        $definition=null;foreach(rpCatalog() as $d)if($d['id']===$id)$definition=$d;
        if(!$definition)throw new ReportingError('Select a valid report.',404);
        foreach(['customer','supplier','user','product','group','terminal'] as $k)if($this->filter[$k]&&!in_array($k,$definition['filters'],true))throw new ReportingError('This filter is not applicable to the selected report.');
        $rows=[];$columns=[];$money=[];$numbers=[];$purchase=str_starts_with($id,'purchase-');$key=$purchase?substr($id,9):substr($id,6);
        $events=['sales-starting-cash','sales-stock-movement','sales-refunds','sales-credit-payments','finance-transactions'];
        if(in_array($id,$events,true)||str_starts_with($id,'stock-')||str_starts_with($id,'loss-'))[$rows,$columns,$money,$numbers]=$this->eventReport($id);
        elseif(str_starts_with($key,'payment-types')){
            $facts=$purchase?$this->purchasePayments():$this->salesPayments();$keys=['payment_type'];if(str_ends_with($key,'users'))$keys=[...$keys,'created_by','user_name'];if(str_ends_with($key,'customers')||str_ends_with($key,'suppliers'))$keys=[...$keys,$purchase?'supplier_id':'customer_id','party_name'];
            $rows=$this->aggregate($facts,$keys,['amount']);$columns=['payment_type'=>'Payment type'];if(in_array('user_name',$keys,true))$columns['user_name']='User';if(in_array('party_name',$keys,true))$columns['party_name']=$purchase?'Supplier':'Customer';$columns['amount']='Amount';$money=['amount'];
            if($this->filter['product']||$this->filter['group'])$this->warning('Tender reports show full payments for documents containing the selected items, not an item payment allocation.');
        }elseif(in_array($key,['invoice-list','unpaid','discounts'],true)){
            foreach($this->documents($purchase) as $d){if(!$this->docMatches((int)$d['id'],$purchase))continue;$balance=$this->balance($d,$purchase);
                if($key==='unpaid'&&$balance!==null&&$balance<=0)continue;if($key==='discounts'&&rpMoney($d['discount'])===0)continue;
                if($balance===null)$this->warning('Some purchase balances are unknown because payment metadata is missing.');
                $rows[]=['date'=>$d[$purchase?'purchase_date':'sale_date'],'number'=>$d[$purchase?'purchase_no':'sale_no'],'party_name'=>$d['party_name']?:($purchase?'Unknown supplier':'Walk-in'),'user_name'=>$d['user_name']?:'Unassigned','subtotal'=>rpMoney($d['subtotal']),'discount'=>rpMoney($d['discount']),'tax'=>rpMoney($d['tax']),'gross'=>rpMoney($d['total']),'balance'=>$balance,'status'=>$d['status']];
            }$columns=['date'=>'Date','number'=>$purchase?'Purchase':'Invoice','party_name'=>$purchase?'Supplier':'Customer','user_name'=>'User','subtotal'=>'Subtotal','discount'=>'Discount','tax'=>'Tax','gross'=>'Total','balance'=>'Outstanding','status'=>'Status'];$money=['subtotal','discount','tax','gross','balance'];
            if($this->filter['product']||$this->filter['group'])$this->warning('Document lists show full document totals when a selected item matches.');
        }elseif($key==='expiration-date'){
            foreach($this->facts(true,false,true) as $f){$m=$f['metadata'];$expiry=$m['expirationDate']??$m['expiryDate']??$m['expiration_date']??null;if(!$expiry){$this->warning('Some purchase items have no recorded expiration date; none is inferred.');continue;}try{$expiry=rpDate(substr((string)$expiry,0,10));}catch(ReportingError){$this->warning('Invalid recorded expiration dates were omitted.');continue;}if($expiry<$this->start||$expiry>=$this->end)continue;$rows[]=['number'=>$f['number'],'product_name'=>$f['product_name'],'quantity'=>$f['quantity'],'expiry'=>$expiry];}
            usort($rows,fn($a,$b)=>strcmp($a['expiry'],$b['expiry']));$this->warning('The selected period filters expiration dates, not purchase dates. Quantities are recorded purchased batch quantities; remaining per-batch stock is not tracked.');
            $columns=['number'=>'Purchase','product_name'=>'Product','quantity'=>'Quantity','expiry'=>'Expiration date'];$numbers=['quantity'];
        }else{
            $facts=$this->facts($purchase,$key==='voided-items');
            if($key==='voided-items')$facts=array_values(array_filter($facts,fn($f)=>in_array(strtoupper($f['status']),['VOID','VOIDED'],true)));
            elseif(!$purchase&&!in_array($key,['hourly','hourly-product-groups','item-discounts'],true))$facts=[...$facts,...$this->refundFacts()];
            foreach($facts as &$f){$f['day']=substr($f['date'],0,10);$f['hour']=substr($f['date'],11,2).':00';$f['rate']=$f['net']!==0?number_format(100*$f['tax']/$f['net'],2).'%':'0.00%';$f['profit']=$f['cost']===null?null:$f['net']-$f['cost'];}unset($f);
            if(in_array($key,['products','product-groups','customers','suppliers','users','daily','hourly','hourly-product-groups','order-number','tax-rates','profit'],true)){
                $keys=match($key){'products','profit'=>['product_id','sku','product_name'],'product-groups'=>['group_id','group_name'],'customers'=>['customer_id','party_name'],'suppliers'=>['supplier_id','party_name'],'users'=>['created_by','user_name'],'daily'=>['day'],'hourly'=>['hour'],'hourly-product-groups'=>['hour','group_id','group_name'],'order-number'=>['order_number'],'tax-rates'=>['rate']};
                $metrics=['quantity','discount','net','tax','gross'];if($key==='profit')$metrics=[...$metrics,'cost','profit'];$rows=$this->aggregate($facts,$keys,$metrics);
                $labels=['sku'=>'Code','product_name'=>'Product','group_name'=>'Product group','party_name'=>$purchase?'Supplier':'Customer','user_name'=>'User','day'=>'Date','hour'=>'Hour','order_number'=>'Table / order','rate'=>'Recorded effective tax rate'];foreach($keys as $k)if(isset($labels[$k]))$columns[$k]=$labels[$k];
                $columns+=['quantity'=>'Quantity','discount'=>'Document discount','net'=>$purchase?'Net purchases':'Net sales','tax'=>'Tax','gross'=>'Total'];$money=['discount','net','tax','gross'];$numbers=['quantity'];
                if($key==='profit'){$columns+=['cost'=>'Historical cost','profit'=>'Profit','margin'=>'Margin %'];$money=[...$money,'cost','profit'];$numbers[]='margin';foreach($rows as &$r)$r['margin']=$r['profit']===null||$r['net']==0?null:round(100*$r['profit']/$r['net'],2);unset($r);if(array_filter($facts,fn($f)=>$f['cost']===null))$this->warning('Historical cost snapshots are missing for some items. Cost/profit is unknown; current product cost is never substituted.');}
                if($key==='tax-rates')$this->warning('Historical tax-rate IDs are not stored. Effective rates are calculated from recorded net and tax amounts, not current tax settings.');
            }else{
                $rows=$facts;if($key==='item-discounts'){$rows=array_values(array_filter($rows,fn($f)=>$f['item_discount']===null||$f['item_discount']!==0));if(array_filter($rows,fn($f)=>$f['item_discount']===null))$this->warning('Some purchase items have no recorded discount metadata; those amounts are unknown.');}
                $columns=['date'=>'Date','number'=>'Document','product_name'=>'Product','party_name'=>$purchase?'Supplier':'Customer','user_name'=>'User','quantity'=>'Quantity','item_discount'=>'Item discount','discount'=>'Document discount','net'=>'Net amount','tax'=>'Tax','gross'=>'Total'];$money=['item_discount','discount','net','tax','gross'];$numbers=['quantity'];
            }
            $this->warning('Header discount, tax and final totals are allocated across stored item values with cent-exact remainders. Product/group names reflect current master data.');
            if(!$purchase)$this->warning('Void/cancelled sales are excluded. Original sales retain their sale date; recorded refunds are separate negative events in product/group/customer/user/daily/profit reports. Hourly reports show gross sales events, matching the Aronium hourly template.');
        }
        $totals=[];foreach(array_unique([...$money,...array_diff($numbers,['margin'])]) as $m){$totals[$m]=0;foreach($rows as $r){if(($r[$m]??null)===null){$totals[$m]=null;break;}$totals[$m]+=$r[$m];}}
        foreach($rows as &$r){$r=array_intersect_key($r,$columns);foreach($money as $m)if(isset($r[$m]))$r[$m]=rpDecimal((int)$r[$m]);}unset($r);foreach($money as $m)if(isset($totals[$m]))$totals[$m]=rpDecimal((int)$totals[$m]);
        $company=rpRows($this->db,'SELECT company_name,registration_no,street_name,building_number,postal_code,city,state,phone_number,logo_url,currency_code FROM company_settings WHERE outlet_id=? ORDER BY id LIMIT 1',[$this->outlet])[0]??['company_name'=>''];
        $outlet=rpRows($this->db,'SELECT outlet_code,outlet_name FROM outlets WHERE id=?',[$this->outlet])[0];
        return ['ok'=>true,'api_version'=>'V10','reporting_version'=>'R1','report'=>$definition,'outlet'=>$outlet,'company'=>$company,'period'=>['start'=>$this->start,'end'=>(new DateTimeImmutable($this->end))->modify('-1 day')->format('Y-m-d')],'columns'=>array_map(fn($k,$label)=>['key'=>$k,'label'=>$label,'type'=>in_array($k,$money,true)?'money':(in_array($k,$numbers,true)?'number':'text')],array_keys($columns),array_values($columns)),'rows'=>$rows,'totals'=>$totals,'warnings'=>array_values($this->warnings),'generated_at'=>date(DATE_ATOM),'row_count'=>count($rows)];
    }
}
