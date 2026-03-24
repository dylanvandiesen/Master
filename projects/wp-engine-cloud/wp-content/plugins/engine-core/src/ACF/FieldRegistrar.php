<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\ACF;

final class FieldRegistrar
{
    public function register(): void
    {
        if (! function_exists('acf_add_local_field_group')) {
            return;
        }

        acf_add_local_field_group([
            'key' => 'group_engine_layout',
            'title' => 'Engine Layout',
            'menu_order' => 0,
            'style' => 'seamless',
            'active' => true,
            'fields' => [
                [
                    'key' => 'field_engine_layout_template',
                    'label' => 'Layout Template',
                    'name' => 'layout_template',
                    'type' => 'text',
                    'instructions' => 'Select approved template ID.',
                ],
                [
                    'key' => 'field_engine_page_sections',
                    'label' => 'Page Sections',
                    'name' => 'page_sections',
                    'type' => 'flexible_content',
                    'max' => 0,
                    'button_label' => 'Add section',
                    'layouts' => [],
                ],
                [
                    'key' => 'field_engine_layout_options',
                    'label' => 'Layout Options',
                    'name' => 'layout_options',
                    'type' => 'group',
                    'sub_fields' => [
                        [
                            'key' => 'field_engine_layout_options_hide_title',
                            'label' => 'Hide page title',
                            'name' => 'hide_title',
                            'type' => 'true_false',
                            'ui' => 1,
                        ],
                    ],
                ],
                [
                    'key' => 'field_engine_schema_version',
                    'label' => 'Schema Version',
                    'name' => 'engine_schema_version',
                    'type' => 'text',
                    'default_value' => '1.0.0',
                    'readonly' => 1,
                ],
            ],
            'location' => [
                [
                    [
                        'param' => 'post_type',
                        'operator' => '!=',
                        'value' => 'acf-field-group',
                    ],
                ],
            ],
        ]);
    }
}
