<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-SP-Manager-Settings-Version: V2');
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

function ensureSettingsTables(PDO $pdo): void {
    // Additive only. This lets the API work even if the dedicated settings tables
    // were not created during an earlier database migration.
    $pdo->exec("CREATE TABLE IF NOT EXISTS app_settings (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        setting_group VARCHAR(100) NOT NULL,
        setting_key VARCHAR(150) NOT NULL,
        setting_value LONGTEXT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_app_setting(setting_group,setting_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS outlet_settings (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        outlet_id BIGINT UNSIGNED NOT NULL,
        setting_group VARCHAR(100) NOT NULL,
        setting_key VARCHAR(150) NOT NULL,
        setting_value LONGTEXT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_outlet_setting(outlet_id,setting_group,setting_key),
        CONSTRAINT fk_outlet_setting_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS email_settings (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        outlet_id BIGINT UNSIGNED NULL,
        smtp_host VARCHAR(255) NULL,
        smtp_port INT NULL,
        encryption VARCHAR(30) NULL,
        username VARCHAR(255) NULL,
        password_encrypted TEXT NULL,
        from_name VARCHAR(150) NULL,
        from_email VARCHAR(255) NULL,
        enabled TINYINT(1) NOT NULL DEFAULT 0,
        settings_json LONGTEXT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_email_outlet(outlet_id),
        CONSTRAINT fk_email_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS printers (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        outlet_id BIGINT UNSIGNED NULL,
        printer_name VARCHAR(150) NOT NULL,
        printer_type VARCHAR(50) NULL,
        connection_type VARCHAR(50) NULL,
        address VARCHAR(255) NULL,
        paper_size VARCHAR(30) NULL,
        characters_per_line INT NULL,
        copies INT NOT NULL DEFAULT 1,
        feed_lines INT NOT NULL DEFAULT 0,
        cut_paper TINYINT(1) NOT NULL DEFAULT 1,
        alignment VARCHAR(30) NULL,
        code_page VARCHAR(50) NULL,
        character_set VARCHAR(50) NULL,
        rtl TINYINT(1) NOT NULL DEFAULT 0,
        rich_formatting TINYINT(1) NOT NULL DEFAULT 0,
        print_bitmap TINYINT(1) NOT NULL DEFAULT 0,
        print_barcode TINYINT(1) NOT NULL DEFAULT 0,
        logo_full_width TINYINT(1) NOT NULL DEFAULT 0,
        margin_left DECIMAL(8,2) NULL,
        margin_right DECIMAL(8,2) NULL,
        font_family VARCHAR(100) NULL,
        font_size DECIMAL(8,2) NULL,
        active TINYINT(1) NOT NULL DEFAULT 1,
        settings_json LONGTEXT NULL,
        CONSTRAINT fk_printer_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS hardware_devices (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        outlet_id BIGINT UNSIGNED NULL,
        device_type VARCHAR(50) NOT NULL,
        device_name VARCHAR(150) NOT NULL,
        connection_type VARCHAR(50) NULL,
        address VARCHAR(255) NULL,
        port VARCHAR(50) NULL,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        settings_json LONGTEXT NULL,
        last_seen_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_hardware_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS backup_records (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        outlet_id BIGINT UNSIGNED NULL,
        backup_type VARCHAR(50) NOT NULL,
        file_name VARCHAR(255) NULL,
        storage_location TEXT NULL,
        created_by BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
        metadata_json LONGTEXT NULL,
        CONSTRAINT fk_backup_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

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

function cryptoKey(string $dbName): string {
    return hash('sha256', 'SP-Manager settings encryption|' . $dbName, true);
}

function encryptSecret(string $plain, string $dbName): string {
    if ($plain === '') return '';
    $iv = random_bytes(16);
    $cipher = openssl_encrypt($plain, 'AES-256-CBC', cryptoKey($dbName), OPENSSL_RAW_DATA, $iv);
    return base64_encode($iv . ($cipher === false ? '' : $cipher));
}

function decryptSecret(string $stored, string $dbName): string {
    if ($stored === '') return '';
    $raw = base64_decode($stored, true);
    if ($raw === false || strlen($raw) < 17) return '';
    $iv = substr($raw, 0, 16);
    $payload = substr($raw, 16);
    $plain = openssl_decrypt($payload, 'AES-256-CBC', cryptoKey($dbName), OPENSSL_RAW_DATA, $iv);
    return $plain === false ? '' : $plain;
}

function readEmail(PDO $pdo, int $oid, string $dbName): array {
    $q = $pdo->prepare('SELECT * FROM email_settings WHERE outlet_id=? LIMIT 1');
    $q->execute([$oid]);
    $r = $q->fetch();
    if (!$r) return [];
    $meta = json_decode((string)($r['settings_json'] ?? ''), true);
    $meta = is_array($meta) ? $meta : [];
    return array_merge([
        'host' => (string)($r['smtp_host'] ?? ''),
        'port' => (int)($r['smtp_port'] ?? 465),
        'ssl' => strtolower((string)($r['encryption'] ?? 'ssl')) !== 'none',
        'displayName' => (string)($r['from_name'] ?? ''),
        'emailAddress' => (string)($r['from_email'] ?? ''),
        'username' => (string)($r['username'] ?? ''),
        'password' => decryptSecret((string)($r['password_encrypted'] ?? ''), $dbName),
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
    $meta = is_array($meta) ? $meta : [];
    return array_merge([
        'name'=>$r['company_name']??'Shining Pearl Tinted','registrationNo'=>$r['registration_no']??'','taxNumber'=>$r['tax_number']??'','phoneNumber'=>$r['phone_number']??'','email'=>$r['email']??'','website'=>$r['website']??'','streetName'=>$r['street_name']??'','buildingNumber'=>$r['building_number']??'','additionalStreetName'=>$r['additional_street_name']??'','plotIdentification'=>$r['plot_identification']??'','district'=>$r['district']??'','postalCode'=>$r['postal_code']??'','city'=>$r['city']??'','state'=>$r['state']??'','country'=>$r['country']??'Malaysia','logo'=>$r['logo_url']??'','currencyCode'=>$r['currency_code']??'MYR','currencySymbol'=>$r['currency_symbol']??'RM'
    ], $meta);
}

function saveCompany(PDO $pdo, int $oid, array $c): void {
    $meta=$c;
    foreach(['name','registrationNo','taxNumber','phoneNumber','email','website','streetName','buildingNumber','additionalStreetName','plotIdentification','district','postalCode','city','state','country','logo','currencyCode','currencySymbol'] as $k) unset($meta[$k]);
    $sql='INSERT INTO company_settings(outlet_id,company_name,registration_no,tax_number,phone_number,email,website,street_name,building_number,additional_street_name,plot_identification,district,postal_code,city,state,country,logo_url,currency_code,currency_symbol,metadata_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE company_name=VALUES(company_name),registration_no=VALUES(registration_no),tax_number=VALUES(tax_number),phone_number=VALUES(phone_number),email=VALUES(email),website=VALUES(website),street_name=VALUES(street_name),building_number=VALUES(building_number),additional_street_name=VALUES(additional_street_name),plot_identification=VALUES(plot_identification),district=VALUES(district),postal_code=VALUES(postal_code),city=VALUES(city),state=VALUES(state),country=VALUES(country),logo_url=VALUES(logo_url),currency_code=VALUES(currency_code),currency_symbol=VALUES(currency_symbol),metadata_json=VALUES(metadata_json)';
    $q=$pdo->prepare($sql);$q->execute([$oid,$c['name']??'Shining Pearl Tinted',$c['registrationNo']??null,$c['taxNumber']??null,$c['phoneNumber']??null,$c['email']??null,$c['website']??null,$c['streetName']??null,$c['buildingNumber']??null,$c['additionalStreetName']??null,$c['plotIdentification']??null,$c['district']??null,$c['postalCode']??null,$c['city']??null,$c['state']??null,$c['country']??'Malaysia',$c['logo']??null,$c['currencyCode']??'MYR',$c['currencySymbol']??'RM',jsonEncodeValue($meta)]);
}

try {
    $pdo=new PDO("mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
    ensureSettingsTables($pdo);
    $oid=outlet($pdo,$_GET['outlet_id']??$_POST['outlet_id']??'SP01');
    $action=strtolower(trim((string)($_GET['action']??$_POST['action']??'')));

    if($action==='health'){
        out(['ok'=>true,'service'=>'SP-Manager settings API','settings_version'=>'V2','outletId'=>$oid,'tables'=>[
            'app_settings'=>tableExists($pdo,'app_settings'),
            'outlet_settings'=>tableExists($pdo,'outlet_settings'),
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
        if($email) $settings['email']=array_merge(is_array($settings['email']??null)?$settings['email']:[],$email);
        if($hardwareRows) $settings['hardware']=array_merge(is_array($settings['hardware']??null)?$settings['hardware']:[],$hardwareRows['LOCAL_AGENT']??[],$hardwareRows['CASH_DRAWER']??[],$hardwareRows['CUSTOMER_DISPLAY']??[]);
        if(is_array($backup)) $settings['database']=array_merge(is_array($settings['database']??null)?$settings['database']:[],$backup);
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
            'ok'=>true,'settings_version'=>'V2','settings'=>$settings,
            'email'=>$email,
            'printers'=>$printers,
            'hardware'=>$hardwareRows,
            'backupRecords'=>$backupQ->fetchAll(),
            'company'=>company($pdo,$oid),
            'businessDay'=>readSetting($pdo,$oid,'SP-MANAGER','businessDay',null),
            'taxRate'=>readSetting($pdo,$oid,'SP-MANAGER','taxRate',null),
            'customerDisplayTerminal'=>readSetting($pdo,$oid,'SP-MANAGER','customerDisplayTerminal',null),
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
            appSetting($pdo,'SP-MANAGER','settings_schema_version','V2');
            appSetting($pdo,'SP-MANAGER','last_settings_write',gmdate('c'));
        }
        if(array_key_exists('businessDay',$b))setting($pdo,$oid,'SP-MANAGER','businessDay',$b['businessDay']);
        if(array_key_exists('taxRate',$b))setting($pdo,$oid,'SP-MANAGER','taxRate',$b['taxRate']);
        if(array_key_exists('customerDisplayTerminal',$b))setting($pdo,$oid,'SP-MANAGER','customerDisplayTerminal',$b['customerDisplayTerminal']);
        if(is_array($b['company']??null))saveCompany($pdo,$oid,$b['company']);
        $pdo->commit();
        out(['ok'=>true,'settings_version'=>'V2','settings'=>readSetting($pdo,$oid,'SP-MANAGER','settings',[]),'email'=>readEmail($pdo,$oid,$name),'printers'=>readPrinters($pdo,$oid),'hardware'=>readHardware($pdo,$oid)]);
    }

    if($action==='company'&&$_SERVER['REQUEST_METHOD']==='POST'){
        $b=body(); saveCompany($pdo,$oid,is_array(($b['company']??null))?$b['company']:$b); out(['ok'=>true,'company'=>company($pdo,$oid)]);
    }

    if($action==='setting'&&$_SERVER['REQUEST_METHOD']==='POST'){
        $b=body();$key=trim((string)($b['key']??''));if($key==='')throw new InvalidArgumentException('Setting key is required.');setting($pdo,$oid,'SP-MANAGER',$key,$b['value']??null);out(['ok'=>true,'settings_version'=>'V2']);
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
    out(['ok'=>false,'settings_version'=>'V2','error'=>$e->getMessage()],500);
}
