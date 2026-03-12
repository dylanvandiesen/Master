<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Pattern;

final class PatternAdminController
{
    public function __construct(
        private readonly PatternRepository $patterns,
        private readonly PatternSyncService $sync
    ) {
    }

    public function register(): void
    {
        add_action('wp_ajax_engine_core_pattern_save', [$this, 'save']);
        add_action('wp_ajax_engine_core_pattern_diff', [$this, 'diff']);
        add_action('wp_ajax_engine_core_pattern_batch_sync_preview', [$this, 'batchPreview']);
        add_action('wp_ajax_engine_core_pattern_batch_sync_apply', [$this, 'batchApply']);
        add_action('wp_ajax_engine_core_pattern_batch_sync_rollback', [$this, 'rollback']);
    }

    public function save(): void
    {
        check_ajax_referer('engine_core_pattern', 'nonce');
        if (! current_user_can('edit_posts')) {
            wp_send_json_error(['message' => 'Forbidden'], 403);
        }

        $postId = (int) ($_POST['post_id'] ?? 0);
        $mode = sanitize_key((string) ($_POST['inherit_mode'] ?? 'detached'));
        $title = sanitize_text_field((string) ($_POST['title'] ?? 'Untitled Pattern'));

        $rows = get_post_meta($postId, 'page_sections', true);
        $rows = is_array($rows) ? $rows : [];

        $patternId = $this->patterns->create($title, $rows);
        if ($patternId <= 0) {
            wp_send_json_error(['message' => 'Pattern save failed'], 500);
        }

        $pattern = $this->patterns->get($patternId);
        $instance = [
            'pattern_id' => $patternId,
            'pattern_version' => (int) ($pattern['version'] ?? 1),
            'inherit_mode' => $mode === 'inherited' ? 'inherited' : 'detached',
            'last_synced_at' => gmdate('c'),
            'source_hash' => (string) ($pattern['source_hash'] ?? ''),
            'rows' => $mode === 'detached' ? $rows : (is_array($pattern['rows'] ?? null) ? $pattern['rows'] : []),
        ];

        update_post_meta($postId, '_engine_pattern_instance', $instance);
        if ($instance['inherit_mode'] === 'inherited') {
            update_post_meta($postId, 'page_sections', $instance['rows']);
        }

        wp_send_json_success(['pattern' => $pattern, 'instance' => $instance]);
    }

    public function diff(): void
    {
        check_ajax_referer('engine_core_pattern', 'nonce');
        if (! current_user_can('edit_posts')) {
            wp_send_json_error(['message' => 'Forbidden'], 403);
        }

        $postId = (int) ($_POST['post_id'] ?? 0);
        wp_send_json_success($this->sync->diffInstance($postId));
    }

    public function batchPreview(): void
    {
        check_ajax_referer('engine_core_pattern', 'nonce');
        if (! current_user_can('edit_posts')) {
            wp_send_json_error(['message' => 'Forbidden'], 403);
        }

        $postIds = array_map('intval', (array) ($_POST['post_ids'] ?? []));
        wp_send_json_success(['preview' => $this->sync->batchSyncPreview($postIds)]);
    }

    public function batchApply(): void
    {
        check_ajax_referer('engine_core_pattern', 'nonce');
        if (! current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Forbidden'], 403);
        }

        $postIds = array_map('intval', (array) ($_POST['post_ids'] ?? []));
        wp_send_json_success($this->sync->applyInheritedSync($postIds));
    }

    public function rollback(): void
    {
        check_ajax_referer('engine_core_pattern', 'nonce');
        if (! current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Forbidden'], 403);
        }

        $snapshotId = sanitize_text_field((string) ($_POST['snapshot_id'] ?? ''));
        wp_send_json_success($this->sync->rollback($snapshotId));
    }
}
