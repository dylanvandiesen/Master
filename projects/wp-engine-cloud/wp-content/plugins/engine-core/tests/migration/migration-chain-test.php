<?php

declare(strict_types=1);

$optStore = [];
if (!function_exists('wp_generate_password')) { function wp_generate_password($l=12,$s=false,$e=false){ return 'testsnapshot'; } }
if (!function_exists('get_option')) { function get_option($k,$d=false){ global $optStore; return $optStore[$k] ?? $d; } }
if (!function_exists('update_option')) { function update_option($k,$v,$a=false){ global $optStore; $optStore[$k]=$v; return true; } }
if (!function_exists('delete_option')) { function delete_option($k){ global $optStore; unset($optStore[$k]); return true; } }
if (!function_exists('get_current_user_id')) { function get_current_user_id(){ return 1; } }
if (!function_exists('wp_generate_uuid4')) { function wp_generate_uuid4(){ return 'uuid-test'; } }

$GLOBALS['meta'] = [
    10 => [
        'engine_schema_version' => '1.0.0',
        'page_sections' => [
            ['acf_fc_layout' => 'hero', 'heading' => 'Legacy heading'],
            ['acf_fc_layout' => 'cta', 'button_text' => 'Start now'],
        ],
    ],
    11 => [
        'engine_schema_version' => '0.9.0',
        'page_sections' => [
            ['acf_fc_layout' => 'hero', 'heading' => 'Unsupported'],
        ],
    ],
];
if (!function_exists('get_post_meta')) {
    function get_post_meta($id,$k,$s=true){ return $GLOBALS['meta'][(int)$id][$k] ?? ''; }
}
if (!function_exists('update_post_meta')) {
    function update_post_meta($id,$k,$v){ $GLOBALS['meta'][(int)$id][$k]=$v; return true; }
}

require_once __DIR__ . '/../../src/Pattern/PatternSnapshotStore.php';
require_once __DIR__ . '/../../src/Audit/AuditLogger.php';
require_once __DIR__ . '/../../src/Migration/MigrationStepInterface.php';
require_once __DIR__ . '/../../src/Migration/MigrationPlan.php';
require_once __DIR__ . '/../../src/Migration/MigrationRegistry.php';
require_once __DIR__ . '/../../src/Migration/MigrationValidator.php';
require_once __DIR__ . '/../../src/Migration/MigrationRunner.php';
require_once __DIR__ . '/../../src/Migration/Steps/Schema110Migration.php';
require_once __DIR__ . '/../../src/Migration/Steps/Schema120Migration.php';

use WPEngineCloud\EngineCore\Audit\AuditLogger;
use WPEngineCloud\EngineCore\Migration\MigrationRegistry;
use WPEngineCloud\EngineCore\Migration\MigrationRunner;
use WPEngineCloud\EngineCore\Migration\MigrationValidator;
use WPEngineCloud\EngineCore\Migration\Steps\Schema110Migration;
use WPEngineCloud\EngineCore\Migration\Steps\Schema120Migration;
use WPEngineCloud\EngineCore\Pattern\PatternSnapshotStore;

$runner = new MigrationRunner(
    new PatternSnapshotStore(),
    new AuditLogger(),
    new MigrationRegistry([new Schema110Migration(), new Schema120Migration()]),
    new MigrationValidator(),
    '1.2.0'
);

$dry = $runner->dryRun([10, 11]);
$plan = $dry['plans'][0] ?? [];
if (count($plan['steps'] ?? []) !== 2) {
    fwrite(STDERR, "multi-hop plan should include 2 steps\n");
    exit(1);
}

if (($dry['issues'][0] ?? '') === '') {
    fwrite(STDERR, "missing path issue should be reported\n");
    exit(1);
}

$apply = $runner->apply([10, 11]);
if (($GLOBALS['meta'][10]['engine_schema_version'] ?? '') !== '1.2.0') {
    fwrite(STDERR, "schema not upgraded to 1.2.0\n");
    exit(1);
}

$rows = $GLOBALS['meta'][10]['page_sections'] ?? [];
if (($rows[0]['title'] ?? '') !== 'Legacy heading' || isset($rows[0]['heading'])) {
    fwrite(STDERR, "hero transform chain failed\n");
    exit(1);
}
if (($rows[1]['button_label'] ?? '') !== 'Start now' || isset($rows[1]['button_text'])) {
    fwrite(STDERR, "cta transform chain failed\n");
    exit(1);
}

$snapshotId = (string) ($apply['snapshot_id'] ?? '');
$rollback = $runner->rollback($snapshotId);
if (($rollback['status'] ?? '') !== 'restored') {
    fwrite(STDERR, "rollback failed\n");
    exit(1);
}

if (($GLOBALS['meta'][10]['engine_schema_version'] ?? '') !== '1.0.0') {
    fwrite(STDERR, "rollback schema restore failed\n");
    exit(1);
}

$rows = $GLOBALS['meta'][10]['page_sections'] ?? [];
if (($rows[0]['heading'] ?? '') !== 'Legacy heading') {
    fwrite(STDERR, "rollback content restore failed\n");
    exit(1);
}

echo "migration-chain-test: ok\n";
