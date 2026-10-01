<?php
// Set Hostinger MySQL credentials, a private API signing key and the exact frontend origin.
return [
  "db_host" => "localhost",
  "db_port" => "3306",
  "db_name" => "CHANGE_ME",
  "db_user" => "CHANGE_ME",
  "db_pass" => "CHANGE_ME",
  // Generate a random value of at least 64 characters. Do not reuse a password.
  "auth_secret" => "CHANGE_ME_TO_A_RANDOM_SECRET_OF_AT_LEAST_64_CHARACTERS",
  // Example: ["https://your-account.github.io"]. Never use *.
  "allowed_origins" => []
];
