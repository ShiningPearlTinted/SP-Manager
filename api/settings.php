<?php
declare(strict_types=1);
require_once __DIR__ . '/security.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-SP-Manager-Settings-Version: V3');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$config = require __DIR__ . '/config.php';
$db = $config['db'] ?? null;
$host = (string)($db['host'] ?? $config['db_host'] ?? 'localhost');
$port = (string)($db['port'] ?? $config['db_port'] ?? '3306');
$name = (string)($db['name'] ?? $config['db_name'] ?? '');
$user = (string)($db['user'] ?? $config['db_user'] ?? '');
$pass = (string)($db['pass'] ?? $config['db_pass'] ?? '');

function body(): array {
    $v = json_decode(file_get_contents('php://input') ?: '', true);
    return is_array($v) ? $v : [];
}

function out(array $v, int $s = 200): never {
    http_response_code($s);
    echo json_encode($v, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function tableExists(PDO $pdo, string $table): bool {
    $q = $pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?');
    $q->execute([$table]);
    return (int)$q->fetchColumn() > 0;
}

function outlet(PDO $pdo, mixed $v): int {
    $v = trim((string)($v ?? 'SP01'));
    if ($v === '') $v = 'SP01';
    if (ctype_digit($v)) {
        $q = $pdo->prepare('SELECT id FROM outlets WHERE id=? AND active=1 LIMIT 1');
        $q->execute([(int)$v]);
    } else {
        $q = $pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? AND active=1 LIMIT 1');
        $q->execute([$v]);
    }
    $id = (int)($q->fetchColumn() ?: 0);
    if ($id <= 0) throw new InvalidArgumentException('Outlet not found.');
    return $id;
}

function ensureSettingsTables(PDO $pdo):void {foreach(['app_settings','outlet_settings','company_settings','email_settings','printers'] as $t)spRequireTable($pdo,$t);}

function jsonEncodeValue(mixed $value): string {
    return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

function setting(PDO $pdo, int $oid, string $group, string $key, mixed $value): void {
    $q = $pdo->prepare('INSERT INTO outlet_settings(outlet_id,setting_group,setting_key,setting_value) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)');
    $q->execute([$oid, $group, $key, jsonEncodeValue($value)]);
}

function readSetting(PDO $pdo, int $oid, string $group, string $key, mixed $fallback = null): mixed {
    $q = $pdo->prepare('SELECT setting_value FROM outlet_settings WHERE outlet_id=? AND setting_group=? AND setting_key=? LIMIT 1');
    $q->execute([$oid, $group, $key]);
    $v = $q->fetchColumn();
    if ($v === false) return $fallback;
    $d = json_decode((string)$v, true);
    return json_last_error() === JSON_ERROR_NONE ? $d : $v;
}

function appSetting(PDO $pdo, string $group, string $key, mixed $value): void {
    $q = $pdo->prepare('INSERT INTO app_settings(setting_group,setting_key,setting_value) VALUES(?,?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)');
    $q->execute([$group, $key, jsonEncodeValue($value)]);
}

function getAppSetting(PDO $pdo, string $group, string $key, mixed $fallback = null): mixed {
    $q = $pdo->prepare('SELECT setting_value FROM app_settings WHERE setting_group=? AND setting_key=? LIMIT 1');
    $q->execute([$group, $key]);
    $v = $q->fetchColumn();
    if ($v === false) return $fallback;
    $d = json_decode((string)$v, true);
    return json_last_error() === JSON_ERROR_NONE ? $d : $v;
}







function readEmail(PDO $pdo, int $oid, string $dbName): array {
    $q = $pdo->prepare('SELECT * FROM email_settings WHERE outlet_id=? LIMIT 1');
    $q->execute([$oid]);
    $r = $q->fetch();
    if (!$r) return [];
    $meta = json_decode((string)($r['settings_json'] ?? ''), true);
    $meta = is_array($meta) ? $meta : [];unset($meta['password'],$meta['passwordConfigured']);
    return array_merge([
        'host' => (string)($r['smtp_host'] ?? ''),
        'port' => (int)($r['smtp_port'] ?? 465),
        'ssl' => strtolower((string)($r['encryption'] ?? 'ssl')) !== 'none',
        'displayName' => (string)($r['from_name'] ?? ''),
        'emailAddress' => (string)($r['from_email'] ?? ''),
        'username' => (string)($r['username'] ?? ''),
        'password' => '',
        'passwordConfigured'=>str_starts_with((string)($r['password_encrypted']??''),'gcm1:'),
        'enabled' => (int)($r['enabled'] ?? 0) === 1,
    ], $meta);
}

function saveEmail(PDO $pdo, int $oid, array $email, string $dbName): void {
    $currentQ = $pdo->prepare('SELECT password_encrypted FROM email_settings WHERE outlet_id=? LIMIT 1');
    $currentQ->execute([$oid]);
    $currentEncrypted = (string)($currentQ->fetchColumn() ?: '');
    $password = trim((string)($email['password'] ?? ''));
    $encrypted = $password !== '' ? encryptSecret($password, $dbName) : $currentEncrypted;
    $meta = $email;
    unset($meta['host'], $meta['port'], $meta['ssl'], $meta['displayName'], $meta['emailAddress'], $meta['username'], $meta['password'], $meta['enabled']);
    $enabled = !empty($email['host']) && !empty($email['emailAddress']) && ($encrypted !== '');
    $q = $pdo->prepare('INSERT INTO email_settings(outlet_id,smtp_host,smtp_port,encryption,username,password_encrypted,from_name,from_email,enabled,settings_json) VALUES(?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE smtp_host=VALUES(smtp_host),smtp_port=VALUES(smtp_port),encryption=VALUES(encryption),username=VALUES(username),password_encrypted=VALUES(password_encrypted),from_name=VALUES(from_name),from_email=VALUES(from_email),enabled=VALUES(enabled),settings_json=VALUES(settings_json)');
    $q->execute([
        $oid,
        $email['host'] ?? '',
        (int)($email['port'] ?? 465),
        !empty($email['ssl']) ? 'ssl' : 'none',
        $email['username'] ?? ($email['emailAddress'] ?? ''),
        $encrypted,
        $email['displayName'] ?? '',
        $email['emailAddress'] ?? '',
        $enabled ? 1 : 0,
        jsonEncodeValue($meta),
    ]);
}

function readPrinters(PDO $pdo, int $oid): array {
    $q = $pdo->prepare('SELECT * FROM printers WHERE outlet_id=? AND active=1 ORDER BY id');
    $q->execute([$oid]);
    return array_map(function(array $r): array {
        $meta = json_decode((string)($r['settings_json'] ?? ''), true);
        return [
            'id' => (int)$r['id'],
            'name' => (string)$r['printer_name'],
            'printerType' => (string)($r['printer_type'] ?? ''),
            'connectionType' => (string)($r['connection_type'] ?? ''),
            'address' => (string)($r['address'] ?? ''),
            'paperSize' => (string)($r['paper_size'] ?? ''),
            'charactersPerLine' => (int)($r['characters_per_line'] ?? 0),
            'copies' => (int)($r['copies'] ?? 1),
            'feedLines' => (int)($r['feed_lines'] ?? 0),
            'cutPaper' => (int)($r['cut_paper'] ?? 1) === 1,
            'alignment' => (string)($r['alignment'] ?? 'Left'),
            'codePage' => (string)($r['code_page'] ?? ''),
            'characterSet' => (string)($r['character_set'] ?? ''),
            'rightToLeft' => (int)($r['rtl'] ?? 0) === 1,
            'richFormatting' => (int)($r['rich_formatting'] ?? 0) === 1,
            'printBitmap' => (int)($r['print_bitmap'] ?? 0) === 1,
            'printBarcode' => (int)($r['print_barcode'] ?? 0) === 1,
            'printLogoFullWidth' => (int)($r['logo_full_width'] ?? 0) === 1,
            'marginLeft' => (float)($r['margin_left'] ?? 0),
            'marginRight' => (float)($r['margin_right'] ?? 0),
            'fontFamily' => (string)($r['font_family'] ?? ''),
            'fontSize' => (float)($r['font_size'] ?? 100),
            'settings' => is_array($meta) ? $meta : [],
        ];
    }, $q->fetchAll());
}

function savePrinters(PDO $pdo, int $oid, array $print): void {
    $keys = ['printer','printerReceipt','printerCreditPayments','printerLockedSale','printerKitchenTicket','printerServiceMessages'];
    $names = [];
    foreach ($keys as $k) {
        $name = trim((string)($print[$k] ?? ''));
        if ($name !== '') $names[$name] = true;
    }
    foreach (array_keys($names) as $name) {
        $find = $pdo->prepare('SELECT id FROM printers WHERE outlet_id=? AND printer_name=? LIMIT 1');
        $find->execute([$oid, $name]);
        $id = (int)($find->fetchColumn() ?: 0);
        $params = [
            $oid, $name,
            $print['printerType'] ?? 'Windows printer',
            $print['printerType'] === 'Generic / Text only' ? 'RAW' : 'WINDOWS',
            null,
            $print['paperSize'] ?? '80 mm',
            (int)($print['charactersPerLine'] ?? 42),
            max(1, (int)($print['copies'] ?? 1)),
            max(0, (int)($print['feedLines'] ?? 3)),
            !empty($print['cutPaper']) ? 1 : 0,
            $print['alignment'] ?? 'Left',
            (string)($print['codePage'] ?? '437'),
            (string)($print['characterSet'] ?? 'None'),
            !empty($print['rightToLeft']) ? 1 : 0,
            !empty($print['richFormatting']) ? 1 : 0,
            !empty($print['printBitmap']) ? 1 : 0,
            !empty($print['printBarcode']) ? 1 : 0,
            !empty($print['printLogoFullWidth']) ? 1 : 0,
            (float)($print['marginLeft'] ?? 0),
            (float)($print['marginRight'] ?? 0),
            (string)($print['fontFamily'] ?? 'Arial'),
            (float)($print['fontSize'] ?? 100),
            jsonEncodeValue($print),
        ];
        if ($id > 0) {
            $q = $pdo->prepare('UPDATE printers SET printer_type=?,connection_type=?,address=?,paper_size=?,characters_per_line=?,copies=?,feed_lines=?,cut_paper=?,alignment=?,code_page=?,character_set=?,rtl=?,rich_formatting=?,print_bitmap=?,print_barcode=?,logo_full_width=?,margin_left=?,margin_right=?,font_family=?,font_size=?,active=1,settings_json=? WHERE id=? AND outlet_id=?');
            $updateParams = array_slice($params, 2);
            $updateParams[] = $id;
            $updateParams[] = $oid;
            $q->execute($updateParams);
        } else {
            $q = $pdo->prepare('INSERT INTO printers(outlet_id,printer_name,printer_type,connection_type,address,paper_size,characters_per_line,copies,feed_lines,cut_paper,alignment,code_page,character_set,rtl,rich_formatting,print_bitmap,print_barcode,logo_full_width,margin_left,margin_right,font_family,font_size,active,settings_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
            $q->execute($params);
        }
    }
}

function readHardware(PDO $pdo, int $oid): array {
    $q = $pdo->prepare('SELECT device_type,device_name,connection_type,address,port,enabled,settings_json,last_seen_at FROM hardware_devices WHERE outlet_id=? ORDER BY id');
    $q->execute([$oid]);
    $out = [];
    foreach ($q->fetchAll() as $r) {
        $meta = json_decode((string)($r['settings_json'] ?? ''), true);
        $out[(string)$r['device_type']] = array_merge([
            'deviceName' => (string)$r['device_name'],
            'connectionType' => (string)($r['connection_type'] ?? ''),
            'address' => (string)($r['address'] ?? ''),
            'port' => (string)($r['port'] ?? ''),
            'enabled' => (int)($r['enabled'] ?? 0) === 1,
            'lastSeenAt' => $r['last_seen_at'] ?? null,
        ], is_array($meta) ? $meta : []);
    }
    return $out;
}

function saveHardware(PDO $pdo, int $oid, array $hardware): void {
    $devices = [
        'LOCAL_AGENT' => [
            'device_name' => 'SP-Manager Local Agent',
            'connection_type' => 'HTTP',
            'address' => $hardware['agentUrl'] ?? 'http://127.0.0.1:18765',
            'port' => '18765',
            'enabled' => !empty($hardware['agentEnabled']),
        ],
        'CASH_DRAWER' => [
            'device_name' => 'Cash Drawer',
            'connection_type' => 'PRINTER_PULSE',
            'address' => $hardware['cashDrawerPrinter'] ?? '',
            'port' => '',
            'enabled' => !empty($hardware['cashDrawerEnabled']),
        ],
        'CUSTOMER_DISPLAY' => [
            'device_name' => 'Customer Display',
            'connection_type' => $hardware['customerDisplayMode'] ?? 'COM',
            'address' => $hardware['customerDisplayPort'] ?? '',
            'port' => $hardware['customerDisplayPort'] ?? '',
            'enabled' => !empty($hardware['customerDisplayEnabled']),
        ],
    ];
    foreach ($devices as $type => $base) {
        $meta = $hardware;
        $find = $pdo->prepare('SELECT id FROM hardware_devices WHERE outlet_id=? AND device_type=? LIMIT 1');
        $find->execute([$oid, $type]);
        $id = (int)($find->fetchColumn() ?: 0);
        if ($id > 0) {
            $q = $pdo->prepare('UPDATE hardware_devices SET device_name=?,connection_type=?,address=?,port=?,enabled=?,settings_json=? WHERE id=? AND outlet_id=?');
            $q->execute([$base['device_name'],$base['connection_type'],$base['address'],$base['port'],$base['enabled']?1:0,jsonEncodeValue($meta),$id,$oid]);
        } else {
            $q = $pdo->prepare('INSERT INTO hardware_devices(outlet_id,device_type,device_name,connection_type,address,port,enabled,settings_json) VALUES(?,?,?,?,?,?,?,?)');
            $q->execute([$oid,$type,$base['device_name'],$base['connection_type'],$base['address'],$base['port'],$base['enabled']?1:0,jsonEncodeValue($meta)]);
        }
    }
}

function company(PDO $pdo, int $oid): array {
    $q = $pdo->prepare('SELECT * FROM company_settings WHERE outlet_id=? LIMIT 1');
    $q->execute([$oid]);
    $r = $q->fetch();
    if (!$r) return [];
    $meta = json_decode((string)($r['metadata_json'] ?? ''), true);
    $meta = is_array($meta) ? $meta : [];unset($meta['password'],$meta['passwordConfigured']);
    $logo = trim((string)($meta['logo'] ?? ''));
    if ($logo === '') $logo = (string)($r['logo_url'] ?? '');
    return array_merge([
        'name'=>$r['company_name']??'Shining Pearl Tinted','registrationNo'=>$r['registration_no']??'','taxNumber'=>$r['tax_number']??'','phoneNumber'=>$r['phone_number']??'','email'=>$r['email']??'','website'=>$r['website']??'','streetName'=>$r['street_name']??'','buildingNumber'=>$r['building_number']??'','additionalStreetName'=>$r['additional_street_name']??'','plotIdentification'=>$r['plot_identification']??'','district'=>$r['district']??'','postalCode'=>$r['postal_code']??'','city'=>$r['city']??'','state'=>$r['state']??'','country'=>$r['country']??'Malaysia','logo'=>$logo,'currencyCode'=>$r['currency_code']??'MYR','currencySymbol'=>$r['currency_symbol']??'RM'
    ], $meta, ['logo'=>$logo]);
}

function saveCompany(PDO $pdo, int $oid, array $c): void {
    $meta=$c;
    foreach(['name','registrationNo','taxNumber','phoneNumber','email','website','streetName','buildingNumber','additionalStreetName','plotIdentification','district','postalCode','city','state','country','currencyCode','currencySymbol'] as $k) unset($meta[$k]);
    // Keep logos in LONGTEXT metadata as the durable SQL source. logo_url remains a legacy/small-value field.
    $logo=(string)($c['logo']??'');
    $meta['logo']=$logo;
    $sql='INSERT INTO company_settings(outlet_id,company_name,registration_no,tax_number,phone_number,email,website,street_name,building_number,additional_street_name,plot_identification,district,postal_code,city,state,country,logo_url,currency_code,currency_symbol,metadata_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE company_name=VALUES(company_name),registration_no=VALUES(registration_no),tax_number=VALUES(tax_number),phone_number=VALUES(phone_number),email=VALUES(email),website=VALUES(website),street_name=VALUES(street_name),building_number=VALUES(building_number),additional_street_name=VALUES(additional_street_name),plot_identification=VALUES(plot_identification),district=VALUES(district),postal_code=VALUES(postal_code),city=VALUES(city),state=VALUES(state),country=VALUES(country),logo_url=CASE WHEN CHAR_LENGTH(VALUES(logo_url)) <= 60000 THEN VALUES(logo_url) ELSE NULL END,currency_code=VALUES(currency_code),currency_symbol=VALUES(currency_symbol),metadata_json=VALUES(metadata_json)';
    $legacyLogo = strlen($logo)<=60000 ? $logo : null;
    $q=$pdo->prepare($sql);$q->execute([$oid,$c['name']??'Shining Pearl Tinted',$c['registrationNo']??null,$c['taxNumber']??null,$c['phoneNumber']??null,$c['email']??null,$c['website']??null,$c['streetName']??null,$c['buildingNumber']??null,$c['additionalStreetName']??null,$c['plotIdentification']??null,$c['district']??null,$c['postalCode']??null,$c['city']??null,$c['state']??null,$c['country']??'Malaysia',$legacyLogo,$c['currencyCode']??'MYR',$c['currencySymbol']??'RM',jsonEncodeValue($meta)]);
}

try {
    $pdo=spApiDatabase();
    ensureSettingsTables($pdo);
    $oid=outlet($pdo,$_GET['outlet_id']??$_POST['outlet_id']??'SP01');
    $action=strtolower(trim((string)($_GET['action']??$_POST['action']??'')));

    if($action==='health'){
        out(['ok'=>true,'service'=>'SP-Manager settings API','settings_version'=>'V3','outletId'=>$oid,'tables'=>[
            'app_settings'=>tableExists($pdo,'app_settings'),
            'outlet_settings'=>tableExists($pdo,'outlet_settings'),
            'company_settings'=>tableExists($pdo,'company_settings'),
            'email_settings'=>tableExists($pdo,'email_settings'),
            'printers'=>tableExists($pdo,'printers'),
            'hardware_devices'=>tableExists($pdo,'hardware_devices'),
            'backup_records'=>tableExists($pdo,'backup_records'),
        ]]);
    }

    if($action==='all'&&$_SERVER['REQUEST_METHOD']==='GET'){
        $settings=readSetting($pdo,$oid,'SP-MANAGER','settings',null);
        $settings=is_array($settings)?$settings:[];
        $email=readEmail($pdo,$oid,$name);
        $hardwareRows=readHardware($pdo,$oid);
        $backup=readSetting($pdo,$oid,'SP-MANAGER','database',null);
        $priceTags=readSetting($pdo,$oid,'SP-MANAGER','priceTagSettings',null);
        $posSearchMode=readSetting($pdo,$oid,'SP-MANAGER','posSearchMode',null);
        if($email) $settings['email']=array_merge(is_array($settings['email']??null)?$settings['email']:[],$email);
        if($hardwareRows) $settings['hardware']=array_merge(is_array($settings['hardware']??null)?$settings['hardware']:[],$hardwareRows['LOCAL_AGENT']??[],$hardwareRows['CASH_DRAWER']??[],$hardwareRows['CUSTOMER_DISPLAY']??[]);
        if(is_array($backup)) $settings['database']=array_merge(is_array($settings['database']??null)?$settings['database']:[],$backup);
        if(isset($settings['email'])&&is_array($settings['email']))$settings['email']['password']='';if(isset($settings['hardware']))unset($settings['hardware']['agentToken']);
        $printers=readPrinters($pdo,$oid);
        if($printers){
            foreach($printers as $printerRow){
                if(is_array($printerRow['settings']??null) && $printerRow['settings']){
                    $settings['print']=array_merge(is_array($settings['print']??null)?$settings['print']:[], $printerRow['settings']);
                    break;
                }
            }
        }
        $backupQ=$pdo->prepare('SELECT id,backup_type,file_name,storage_location,created_at,expires_at,status,metadata_json FROM backup_records WHERE outlet_id=? ORDER BY id DESC LIMIT 50');
        $backupQ->execute([$oid]);
        out([
            'ok'=>true,'settings_version'=>'V3','settings'=>$settings,
            'email'=>$email,
            'printers'=>$printers,
            'hardware'=>$hardwareRows,
            'backupRecords'=>$backupQ->fetchAll(),
            'company'=>company($pdo,$oid),
            'businessDay'=>readSetting($pdo,$oid,'SP-MANAGER','businessDay',null),
            'taxRate'=>readSetting($pdo,$oid,'SP-MANAGER','taxRate',null),
            'customerDisplayTerminal'=>readSetting($pdo,$oid,'SP-MANAGER','customerDisplayTerminal',null),
            'priceTagSettings'=>$priceTags,
            'posSearchMode'=>$posSearchMode,
            'settingsStorage'=>'SQL:outlet_settings + dedicated email_settings/printers/hardware_devices/backup_records'
        ]);
    }

    if($action==='save'&&$_SERVER['REQUEST_METHOD']==='POST'){
        $b=body();
        $pdo->beginTransaction();
        if(array_key_exists('settings',$b)&&is_array($b['settings'])){
            $settings=$b['settings'];
            $email=is_array($settings['email']??null)?$settings['email']:[];
            $print=is_array($settings['print']??null)?$settings['print']:[];
            $hardware=is_array($settings['hardware']??null)?$settings['hardware']:[];
            // Keep the complete settings JSON in SQL, but never store the email password there.
            $safe=$settings;
            if(isset($safe['email'])&&is_array($safe['email'])) $safe['email']['password']='';
            setting($pdo,$oid,'SP-MANAGER','settings',$safe);
            if($email) saveEmail($pdo,$oid,$email,$name);
            if($print) savePrinters($pdo,$oid,$print);
            if($hardware) saveHardware($pdo,$oid,$hardware);
            if(isset($settings['database'])&&is_array($settings['database'])) setting($pdo,$oid,'SP-MANAGER','database',$settings['database']);
            appSetting($pdo,'SP-MANAGER','settings_schema_version','V3');
            appSetting($pdo,'SP-MANAGER','last_settings_write',gmdate('c'));
        }
        if(array_key_exists('businessDay',$b))setting($pdo,$oid,'SP-MANAGER','businessDay',$b['businessDay']);
        if(array_key_exists('taxRate',$b))setting($pdo,$oid,'SP-MANAGER','taxRate',$b['taxRate']);
        if(array_key_exists('customerDisplayTerminal',$b))setting($pdo,$oid,'SP-MANAGER','customerDisplayTerminal',$b['customerDisplayTerminal']);
        if(array_key_exists('priceTagSettings',$b))setting($pdo,$oid,'SP-MANAGER','priceTagSettings',$b['priceTagSettings']);
        if(array_key_exists('posSearchMode',$b))setting($pdo,$oid,'SP-MANAGER','posSearchMode',$b['posSearchMode']);
        if(is_array($b['company']??null))saveCompany($pdo,$oid,$b['company']);
        $pdo->commit();
        out(['ok'=>true,'settings_version'=>'V3','settings'=>readSetting($pdo,$oid,'SP-MANAGER','settings',[]),'email'=>readEmail($pdo,$oid,$name),'printers'=>readPrinters($pdo,$oid),'hardware'=>readHardware($pdo,$oid)]);
    }

    if($action==='company'&&$_SERVER['REQUEST_METHOD']==='POST'){
        $b=body(); saveCompany($pdo,$oid,is_array(($b['company']??null))?$b['company']:$b); out(['ok'=>true,'company'=>company($pdo,$oid)]);
    }

    if($action==='setting'&&$_SERVER['REQUEST_METHOD']==='POST'){
        $b=body();$key=trim((string)($b['key']??''));if($key==='')throw new InvalidArgumentException('Setting key is required.');setting($pdo,$oid,'SP-MANAGER',$key,$b['value']??null);out(['ok'=>true,'settings_version'=>'V3']);
    }

    if($action==='backup_record'&&$_SERVER['REQUEST_METHOD']==='POST'){
        $b=body();
        $q=$pdo->prepare('INSERT INTO backup_records(outlet_id,backup_type,file_name,storage_location,created_by,expires_at,status,metadata_json) VALUES(?,?,?,?,?,?,?,?)');
        $q->execute([$oid,(string)($b['backup_type']??'SETTINGS'),$b['file_name']??null,$b['storage_location']??null,!empty($b['created_by'])?(int)$b['created_by']:null,$b['expires_at']??null,(string)($b['status']??'COMPLETED'),jsonEncodeValue($b['metadata']??[]) ]);
        out(['ok'=>true,'backup_id'=>(int)$pdo->lastInsertId()]);
    }

    throw new InvalidArgumentException('Unknown action.');
} catch(Throwable $e) {
    if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();
    out(['ok'=>false,'settings_version'=>'V3','error'=>$e->getMessage()],500);
}
