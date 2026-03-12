<?php
/**
 * Plugin Name: Engine Core
 * Description: Global WordPress rendering engine and governance services.
 * Version: 0.1.0
 * Requires PHP: 8.2
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

$autoloader = __DIR__ . '/vendor/autoload.php';
if (file_exists($autoloader)) {
    require_once $autoloader;
}

\WPEngineCloud\EngineCore\Bootstrap::init(__FILE__);
