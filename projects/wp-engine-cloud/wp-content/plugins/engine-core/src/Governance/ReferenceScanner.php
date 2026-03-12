<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Governance;

use wpdb;

final class ReferenceScanner
{
    public function __construct(private readonly wpdb $db)
    {
    }

    /** @return array<string,mixed> */
    public function scanPattern(int $patternId): array
    {
        $needle = sprintf('"pattern_id";i:%d', $patternId);

        $postRefs = $this->db->get_col($this->db->prepare(
            "SELECT post_id FROM {$this->db->postmeta} WHERE meta_key = %s AND meta_value LIKE %s",
            '_engine_pattern_instance',
            '%' . $this->db->esc_like($needle) . '%'
        ));

        $optionRefs = $this->db->get_col($this->db->prepare(
            "SELECT option_name FROM {$this->db->options} WHERE option_value LIKE %s",
            '%' . $this->db->esc_like($needle) . '%'
        ));

        return [
            'pattern_id' => $patternId,
            'post_refs' => array_map('intval', is_array($postRefs) ? $postRefs : []),
            'option_refs' => is_array($optionRefs) ? array_values($optionRefs) : [],
            'is_referenced' => ! empty($postRefs) || ! empty($optionRefs),
        ];
    }
}
