<?php

declare(strict_types=1);

$optStore = [];
if (!function_exists('wp_generate_password')) { function wp_generate_password($l=12,$s=false,$e=false){ return 'testsnapshot'; } }
if (!function_exists('get_option')) { function get_option($k,$d=false){ global $optStore; return $optStore[$k] ?? $d; } }
if (!function_exists('update_option')) { function update_option($k,$v,$a=false){ global $optStore; $optStore[$k]=$v; return true; } }
if (!function_exists('delete_option')) { function delete_option($k){ global $optStore; unset($optStore[$k]); return true; } }
if (!function_exists('get_current_user_id')) { function get_current_user_id(){ return 1; } }
if (!function_exists('wp_generate_uuid4')) { function wp_generate_uuid4(){ return 'uuid-test'; } }
if (!function_exists('get_post_meta')) { function get_post_meta($id,$k,$s=true){ return [['acf_fc_layout'=>'hero']]; } }
if (!function_exists('update_post_meta')) { function update_post_meta($id,$k,$v){ return true; } }

require_once __DIR__ . '/../../src/Pattern/PatternSnapshotStore.php';
require_once __DIR__ . '/../../src/Audit/AuditLogger.php';
require_once __DIR__ . '/../../src/Migration/MigrationRunner.php';

use WPEngineCloud\EngineCore\Audit\AuditLogger;
use WPEngineCloud\EngineCore\Migration\MigrationRunner;
use WPEngineCloud\EngineCore\Pattern\PatternSnapshotStore;

$runner = new MigrationRunner(new PatternSnapshotStore(), new AuditLogger());
$dry = $runner->dryRun([10,11]);
if (($dry['would_update'] ?? 0) < 1) { fwrite(STDERR, "dryRun failed\n"); exit(1);} 
$apply = $runner->apply([10]);
$sid = (string)($apply['snapshot_id'] ?? '');
if ($sid === '') { fwrite(STDERR, "apply failed\n"); exit(1);} 
$rb = $runner->rollback($sid);
if (($rb['status'] ?? '') !== 'restored') { fwrite(STDERR, "rollback failed\n"); exit(1);} 

echo "migration-runner-test: ok\n";
