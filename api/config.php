<?php
declare(strict_types=1);
// Set environment variables, or place a private PHP config outside the webroot.
$private = getenv('SP_MANAGER_PRIVATE_CONFIG');
// Auto-find the private file placed beside public_html, outside the website.
if (!$private) {
    $dir = __DIR__;
    for ($i = 0; $i < 12; $i++) {
        if (strtolower(basename($dir)) === 'public_html') {
            $candidate = dirname($dir) . '/sp-manager-private.php';
            if (is_file($candidate)) $private = $candidate;
            break;
        }
        $parent = dirname($dir);
        if ($parent === $dir) break;
        $dir = $parent;
    }
}

if($private){$value=require $private;if(!is_array($value))throw new RuntimeException('Invalid private config.');return $value;}
 $defaultOrigins = 'https://app.shiningpearltinted.com,https://shiningpearltinted.com,https://www.shiningpearltinted.com,https://shiningpearltinted.github.io'; $origins = getenv('SP_MANAGER_ALLOWED_ORIGINS') ?: $defaultOrigins;return [
 'db'=>['host'=>getenv('SP_MANAGER_DB_HOST')?:'127.0.0.1','port'=>(int)(getenv('SP_MANAGER_DB_PORT')?:3306),'name'=>getenv('SP_MANAGER_DB_NAME')?:'CHANGE_ME_DATABASE','user'=>getenv('SP_MANAGER_DB_USER')?:'CHANGE_ME_USER','pass'=>getenv('SP_MANAGER_DB_PASSWORD')?:'','charset'=>getenv('SP_MANAGER_DB_CHARSET')?:'utf8mb4'],
 'auth_secret'=>getenv('SP_MANAGER_AUTH_SECRET')?:'',
 'encryption_key'=>getenv('SP_MANAGER_ENCRYPTION_KEY')?:'',
 
 'hr_encryption_key'=>getenv('SP_MANAGER_HR_ENCRYPTION_KEY')?:'',
 'backup_dir'=>getenv('SP_MANAGER_BACKUP_DIR')?:'',
 'business_timezone'=>'Asia/Kuala_Lumpur',
 'allowed_origins'=>array_values(array_filter(array_map('trim', explode(',', $origins)))),
];
