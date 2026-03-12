<?php

declare(strict_types=1);

require_once __DIR__ . '/../../src/Validation/ValidationException.php';
require_once __DIR__ . '/../../src/Migration/MigrationStepInterface.php';
require_once __DIR__ . '/../../src/Migration/MigrationConfigLoader.php';

use WPEngineCloud\EngineCore\Migration\MigrationConfigLoader;
use WPEngineCloud\EngineCore\Migration\MigrationStepInterface;
use WPEngineCloud\EngineCore\Validation\ValidationException;

class TestStepA implements MigrationStepInterface {
    public function id(): string { return 'a'; }
    public function fromVersion(): string { return '1.0.0'; }
    public function toVersion(): string { return '1.1.0'; }
    public function transform(array $rows): array { return $rows; }
}

class TestStepB implements MigrationStepInterface {
    public function id(): string { return 'b'; }
    public function fromVersion(): string { return '1.1.0'; }
    public function toVersion(): string { return '1.2.0'; }
    public function transform(array $rows): array { return $rows; }
}

class DuplicateFromStep implements MigrationStepInterface {
    public function id(): string { return 'dup'; }
    public function fromVersion(): string { return '1.0.0'; }
    public function toVersion(): string { return '1.3.0'; }
    public function transform(array $rows): array { return $rows; }
}

$loader = new MigrationConfigLoader();
$tmp = tempnam(sys_get_temp_dir(), 'migcfg');
file_put_contents($tmp, json_encode([
    'latest' => '1.2.0',
    'steps' => [
        ['class' => TestStepA::class],
        ['class' => TestStepB::class],
    ],
]));
$ok = $loader->load($tmp);
if (($ok['latest'] ?? '') !== '1.2.0' || count($ok['steps'] ?? []) !== 2) {
    fwrite(STDERR, "loader valid parse failed\n");
    exit(1);
}

file_put_contents($tmp, json_encode([
    'latest' => '1.3.0',
    'steps' => [
        ['class' => TestStepA::class],
        ['class' => DuplicateFromStep::class],
    ],
]));
$thrown = false;
try {
    $loader->load($tmp);
} catch (ValidationException $e) {
    $thrown = true;
}
if (! $thrown) {
    fwrite(STDERR, "loader duplicate fromVersion should fail\n");
    exit(1);
}

@unlink($tmp);
echo "migration-config-loader-test: ok\n";
