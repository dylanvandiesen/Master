<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Pattern/PatternDiff.php';

use WPEngineCloud\EngineCore\Pattern\PatternDiff;

$diff = new PatternDiff();
$result = $diff->compare(
    ['rows' => [['layout' => 'hero']], 'source_hash' => 'abc', 'version' => 2],
    ['rows' => [['layout' => 'hero']], 'source_hash' => 'def', 'version' => 1, 'extra' => true]
);

if (($result['changed'] ?? false) !== true) {
    fwrite(STDERR, "Expected changed=true\n");
    exit(1);
}

if (!in_array('source_hash', $result['modified'], true)) {
    fwrite(STDERR, "Expected source_hash in modified\n");
    exit(1);
}

if (!in_array('extra', $result['added'], true)) {
    fwrite(STDERR, "Expected extra in added\n");
    exit(1);
}

echo "pattern-diff-test: ok\n";
