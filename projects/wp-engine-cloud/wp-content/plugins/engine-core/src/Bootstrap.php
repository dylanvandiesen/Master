<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore;

use WPEngineCloud\EngineCore\ACF\FieldRegistrar;
use WPEngineCloud\EngineCore\Accessibility\TemplateAccessibilityAudit;
use WPEngineCloud\EngineCore\Observability\Metrics;
use WPEngineCloud\EngineCore\Performance\AssetManager;
use WPEngineCloud\EngineCore\Security\RequestGuard;
use WPEngineCloud\EngineCore\Admin\GovernanceAdmin;
use WPEngineCloud\EngineCore\Governance\CapabilityMap;
use WPEngineCloud\EngineCore\Governance\ReferenceScanner;
use WPEngineCloud\EngineCore\Governance\WorkflowState;
use WPEngineCloud\EngineCore\ACF\NestedDepthGuard;
use WPEngineCloud\EngineCore\Pattern\PatternAdminController;
use WPEngineCloud\EngineCore\Pattern\PatternDiff;
use WPEngineCloud\EngineCore\Pattern\PatternPostType;
use WPEngineCloud\EngineCore\Pattern\PatternRepository;
use WPEngineCloud\EngineCore\Pattern\PatternSnapshotStore;
use WPEngineCloud\EngineCore\Pattern\PatternSyncService;
use WPEngineCloud\EngineCore\Preview\PreviewController;
use WPEngineCloud\EngineCore\Registry\ManifestScanner;
use WPEngineCloud\EngineCore\Registry\ManifestValidator;
use WPEngineCloud\EngineCore\Registry\TemplateContractValidator;
use WPEngineCloud\EngineCore\Render\RenderService;
use WPEngineCloud\EngineCore\Render\Resolver;
use WPEngineCloud\EngineCore\Support\Container;
use WPEngineCloud\EngineCore\Validation\ValidationException;

final class Bootstrap
{
    private static ?Container $container = null;

    public static function init(string $pluginFile): void
    {
        self::$container = new Container();

        self::$container->singleton(Resolver::class, static fn (): Resolver => new Resolver());
        self::$container->singleton(RenderService::class, static fn (Container $c): RenderService => new RenderService($c->get(Resolver::class)));
        self::$container->singleton(FieldRegistrar::class, static fn (): FieldRegistrar => new FieldRegistrar());
        self::$container->singleton(NestedDepthGuard::class, static fn (): NestedDepthGuard => new NestedDepthGuard());
        self::$container->singleton(ManifestValidator::class, static fn (): ManifestValidator => new ManifestValidator());
        self::$container->singleton(ManifestScanner::class, static fn (Container $c): ManifestScanner => new ManifestScanner(
            $c->get(ManifestValidator::class),
            dirname(__DIR__) . '/config/registry'
        ));
        self::$container->singleton(TemplateContractValidator::class, static fn (): TemplateContractValidator => new TemplateContractValidator());
        self::$container->singleton(PreviewController::class, static fn (Container $c): PreviewController => new PreviewController(
            $c->get(RenderService::class),
            $c->get(CapabilityMap::class),
            $c->get(RequestGuard::class)
        ));
        self::$container->singleton(PatternPostType::class, static fn (): PatternPostType => new PatternPostType());
        self::$container->singleton(PatternRepository::class, static fn (): PatternRepository => new PatternRepository());
        self::$container->singleton(PatternDiff::class, static fn (): PatternDiff => new PatternDiff());
        self::$container->singleton(PatternSnapshotStore::class, static fn (): PatternSnapshotStore => new PatternSnapshotStore());
        self::$container->singleton(CapabilityMap::class, static fn (): CapabilityMap => new CapabilityMap());
        self::$container->singleton(RequestGuard::class, static fn (): RequestGuard => new RequestGuard());
        self::$container->singleton(AssetManager::class, static fn (Container $c): AssetManager => new AssetManager($c->get(Resolver::class)));
        self::$container->singleton(Metrics::class, static fn (): Metrics => new Metrics());
        self::$container->singleton(TemplateAccessibilityAudit::class, static fn (): TemplateAccessibilityAudit => new TemplateAccessibilityAudit());
        self::$container->singleton(WorkflowState::class, static fn (): WorkflowState => new WorkflowState());
        self::$container->singleton(ReferenceScanner::class, static fn (): ReferenceScanner => new ReferenceScanner($GLOBALS['wpdb']));
        self::$container->singleton(PatternSyncService::class, static fn (Container $c): PatternSyncService => new PatternSyncService(
            $c->get(PatternRepository::class),
            $c->get(PatternDiff::class),
            $c->get(PatternSnapshotStore::class)
        ));
        self::$container->singleton(GovernanceAdmin::class, static fn (Container $c): GovernanceAdmin => new GovernanceAdmin(
            $c->get(CapabilityMap::class),
            $c->get(WorkflowState::class),
            $c->get(ReferenceScanner::class)
        ));
        self::$container->singleton(PatternAdminController::class, static fn (Container $c): PatternAdminController => new PatternAdminController(
            $c->get(PatternRepository::class),
            $c->get(PatternSyncService::class),
            $c->get(CapabilityMap::class),
            $c->get(RequestGuard::class)
        ));

        add_action('after_setup_theme', static function (): void {
            add_theme_support('title-tag');
            add_theme_support('post-thumbnails');
        });

        add_action('acf/init', static function (): void {
            self::$container?->get(FieldRegistrar::class)->register();
        });


        add_action('init', static function (): void {
            self::$container?->get(PatternPostType::class)->register();
            self::$container?->get(PatternAdminController::class)->register();
            self::$container?->get(AssetManager::class)->register();
            self::$container?->get(Metrics::class)->register();
        });

        add_action('init', static function (): void {
            self::$container?->get(GovernanceAdmin::class)->register();
        });

        add_action('add_meta_boxes', static function (): void {
            $caps = self::$container?->get(CapabilityMap::class);
            if ($caps instanceof CapabilityMap && ! $caps->canGovern()) {
                remove_meta_box('postcustom', null, 'normal');
                remove_meta_box('slugdiv', null, 'normal');
            }
        }, 99);

        add_action('acf/validate_save_post', static function (): void {
            $postId = isset($_POST['post_ID']) ? (int) $_POST['post_ID'] : 0;
            if ($postId <= 0) {
                return;
            }

            try {
                self::$container?->get(NestedDepthGuard::class)->enforce($postId);
            } catch (ValidationException $exception) {
                acf_add_validation_error('page_sections', $exception->getMessage());
            }
        });

        add_action('admin_enqueue_scripts', static function (): void {
            wp_register_script(
                'engine-core-preview',
                plugins_url('assets-preview.js', dirname(__DIR__) . '/engine-core.php'),
                [],
                '0.1.0',
                true
            );

            wp_localize_script('engine-core-preview', 'enginePreview', [
                'ajaxUrl' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('engine_core_preview'),
                'patternNonce' => wp_create_nonce('engine_core_pattern'),
            ]);

            wp_enqueue_script('engine-core-preview');
        });
        add_filter('acf/settings/save_json', static fn (): string => dirname(__DIR__) . '/acf-json');
        add_filter('acf/settings/load_json', static function (array $paths): array {
            $paths[] = dirname(__DIR__) . '/acf-json';
            return array_values(array_unique($paths));
        });

        add_action('init', static function (): void {
            try {
                $scanner = self::$container?->get(ManifestScanner::class);
                $contracts = dirname(__DIR__) . '/config/contracts/templates.json';
                $scan = $scanner?->scan();
                self::$container?->get(TemplateContractValidator::class)->assertCompatibility($scan['variants'] ?? [], $contracts);
            } catch (ValidationException $exception) {
                error_log('[engine-core] ' . $exception->getMessage());
            }
        });

        add_action('init', static fn (): mixed => self::$container?->get(PreviewController::class)->register());

        add_filter('engine_core/render_service', static fn (): RenderService => self::renderService());

        do_action('engine_core/booted', $pluginFile);
    }

    public static function renderService(): RenderService
    {
        if (self::$container === null) {
            self::init('');
        }

        /** @var RenderService $service */
        $service = self::$container->get(RenderService::class);
        return $service;
    }
}
