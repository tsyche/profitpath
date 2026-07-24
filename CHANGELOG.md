# Changelog

All notable changes to ProfitPath are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Full version history (29+ tagged releases) is available via
[GitHub Releases](https://github.com/tsyche/profitpath/releases) and
`git tag`. This file starts tracking forward from here rather than
backfilling every past tag.

## [Unreleased]

### Added
- Client Mix Optimizer — suggests the offering mix that maximizes profit or utilization
- Advanced Charts panel — price × utilization sensitivity heat map, balanced scorecard radar, client capacity funnel
- Subtle gradient polish on KPI boxes and section headers
- Privacy-respecting GoatCounter visit counter (web + APK, tagged and split by platform)

### Changed
- APK pre-release notes now auto-generated from commits since the last tag (was a static "Beta release" body)

### Fixed
- `.debug-body` `max-height` clipping taller collapsible panels (Advanced Charts)
- Scroll lock permanently stranding on rapid double-triggered modal opens (Templates/Settings/analytics/feedback), including the analytics → advanced dashboard transition
- Logo link resolving to a dead URL under the GitHub Pages subpath
- APK never registering a real `versionCode`/`versionName`, silently blocking Android updates
- APK-vs-web analytics misattribution from runtime-only platform detection; now stamped at build time
