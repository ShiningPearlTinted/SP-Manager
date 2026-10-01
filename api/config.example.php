<?php
// Copy to config.php and replace every CHANGE_ME value before deployment.
return [
  "db_host" => "localhost",
  "db_port" => "3306",
  "db_name" => "CHANGE_ME",
  "db_user" => "CHANGE_ME",
  "db_pass" => "CHANGE_ME",
  "auth_secret" => "CHANGE_ME_TO_A_RANDOM_SECRET_OF_AT_LEAST_64_CHARACTERS",
  // Use the origin only, without a path. Example: https://your-account.github.io
  "allowed_origins" => ["https://CHANGE_ME"],
];
