<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Audit;

final class AuditLogger
{
    /** @param array<string,mixed> $payload */
    public function log(string $action, string $entity, array $payload = []): void
    {
        $entry = [
            'ts' => gmdate('c'),
            'actor' => get_current_user_id(),
            'action' => $action,
            'entity' => $entity,
            'result' => (string) ($payload['result'] ?? 'ok'),
            'duration_ms' => (int) ($payload['duration_ms'] ?? 0),
            'correlation_id' => (string) ($payload['correlation_id'] ?? wp_generate_uuid4()),
            'payload' => $payload,
        ];

        $logs = get_option('engine_core_audit_log', []);
        $logs = is_array($logs) ? $logs : [];
        $logs[] = $entry;
        update_option('engine_core_audit_log', array_slice($logs, -5000), false);
    }
}
