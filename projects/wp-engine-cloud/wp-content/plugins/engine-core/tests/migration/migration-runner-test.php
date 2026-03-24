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
    10 => ['engine_schema_version' => '1.0.0', 'page_sections' => [['acf_fc_layout' => 'hero', 'heading' => 'A']]],
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

use WPEngineCloud\EngineCore\Audit\AuditLogger;
use WPEngineCloud\EngineCore\Migration\MigrationRegistry;
use WPEngineCloud\EngineCore\Migration\MigrationRunner;
use WPEngineCloud\EngineCore\Migration\MigrationStepInterface;
use WPEngineCloud\EngineCore\Migration\MigrationValidator;
use WPEngineCloud\EngineCore\Pattern\PatternSnapshotStore;

$step = new class implements MigrationStepInterface {
    public function id(): string { return 'test-step'; }
    public function fromVersion(): string { return '1.0.0'; }
    public function toVersion(): string { return '1.1.0'; }
    public function transform(array $rows): array { foreach($rows as &$r){ if(isset($r['heading'])){$r['headline']=$r['heading']; unset($r['heading']);}} return $rows; }
};

$runner = new MigrationRunner(new PatternSnapshotStore(), new AuditLogger(), new MigrationRegistry([$step]), new MigrationValidator(), '1.1.0');
$dry = $runner->dryRun([10]);
if (($dry['plans'][0]['noop'] ?? true) !== false) { fwrite(STDERR, "dryRun failed\n"); exit(1);} 
$apply = $runner->apply([10]);
$sid = (string)($apply['snapshot_id'] ?? '');
if ($sid === '') { fwrite(STDERR, "apply failed\n"); exit(1);} 
if (($GLOBALS['meta'][10]['engine_schema_version'] ?? '') !== '1.1.0') { fwrite(STDERR, "schema not updated\n"); exit(1);} 
$rb = $runner->rollback($sid);
if (($rb['status'] ?? '') !== 'restored') { fwrite(STDERR, "rollback failed\n"); exit(1);} 
if (($GLOBALS['meta'][10]['engine_schema_version'] ?? '') !== '1.0.0') { fwrite(STDERR, "schema not restored\n"); exit(1);} 

echo "migration-runner-test: ok\n";
