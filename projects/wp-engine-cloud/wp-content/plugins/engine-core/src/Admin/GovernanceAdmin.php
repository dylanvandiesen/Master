<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Admin;

use WPEngineCloud\EngineCore\Governance\CapabilityMap;
use WPEngineCloud\EngineCore\Governance\ReferenceScanner;
use WPEngineCloud\EngineCore\Governance\WorkflowState;

final class GovernanceAdmin
{
    public function __construct(
        private readonly CapabilityMap $capabilities,
        private readonly WorkflowState $workflow,
        private readonly ReferenceScanner $references
    ) {
    }

    public function register(): void
    {
        add_action('admin_menu', [$this, 'registerMenu']);
        add_action('admin_post_engine_core_transition_pattern', [$this, 'transitionPattern']);
    }

    public function registerMenu(): void
    {
        add_menu_page('Engine Governance', 'Engine Governance', CapabilityMap::DESIGN_MANAGE, 'engine-governance', [$this, 'renderOverview'], 'dashicons-admin-generic', 59);

        $this->submenu('engine-governance-modules', 'Modules');
        $this->submenu('engine-governance-variants', 'Variants');
        $this->submenu('engine-governance-patterns', 'Patterns');
        $this->submenu('engine-governance-conditions', 'Conditions');
        $this->submenu('engine-governance-migrations', 'Migrations');
        $this->submenu('engine-governance-deprecations', 'Deprecations');
        $this->submenu('engine-governance-audit', 'Audit');
    }

    private function submenu(string $slug, string $label): void
    {
        add_submenu_page('engine-governance', $label, $label, CapabilityMap::DESIGN_MANAGE, $slug, static function () use ($label): void {
            echo '<div class="wrap"><h1>' . esc_html($label) . '</h1><p>Dedicated governance UX panel.</p></div>';
        });
    }

    public function renderOverview(): void
    {
        $states = $this->workflow->transitions();
        echo '<div class="wrap"><h1>Engine Governance</h1>';
        echo '<p>Content screens remain focused on composition. Advanced controls live here.</p>';
        echo '<h2>Workflow states</h2><ul>';
        foreach ($states as $from => $targets) {
            echo '<li><strong>' . esc_html($from) . '</strong> → ' . esc_html(implode(', ', $targets)) . '</li>';
        }
        echo '</ul></div>';
    }

    public function transitionPattern(): void
    {
        if (! $this->capabilities->canGovern()) {
            wp_die('Forbidden', 403);
        }

        check_admin_referer('engine_core_transition_pattern');

        $patternId = (int) ($_POST['pattern_id'] ?? 0);
        $from = sanitize_key((string) ($_POST['from_state'] ?? WorkflowState::DRAFT));
        $to = sanitize_key((string) ($_POST['to_state'] ?? WorkflowState::DRAFT));

        if (! $this->workflow->canTransition($from, $to)) {
            wp_die('Invalid transition', 400);
        }

        if ($to === WorkflowState::REMOVED) {
            $references = $this->references->scanPattern($patternId);
            if (($references['is_referenced'] ?? false) === true) {
                wp_die('Pattern removal blocked: references exist.', 409);
            }
        }

        update_post_meta($patternId, '_engine_pattern_state', $to);
        wp_safe_redirect(add_query_arg(['page' => 'engine-governance-patterns', 'updated' => '1'], admin_url('admin.php')));
        exit;
    }
}
