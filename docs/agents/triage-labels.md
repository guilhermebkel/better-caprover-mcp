# Triage labels

| Role | Label | Meaning |
| --- | --- | --- |
| needs-triage | `needs-triage` | Maintainer needs to evaluate this issue |
| needs-info | `needs-info` | Waiting on reporter for more information |
| ready-for-agent | `ready-for-agent` | Fully specified, ready for an unattended agent |
| ready-for-human | `ready-for-human` | Requires human implementation |
| wontfix | `wontfix` | Will not be actioned |

## Other labels

| Label | Meaning |
| --- | --- |
| `task` | An issue written as a spec (see `issue-tracker.md`). |
| `bug`, `enhancement` | Type labels from the bug and idea forms. |
| `area:operations`, `area:surfaces`, `area:sandbox`, `area:security`, `area:packaging`, `area:harness`, `area:docs` | Which part of the server the issue touches. |

A triaged issue has exactly one of `ready-for-agent`, `ready-for-human`, `needs-info`, `wontfix`, plus one `area:` label. `needs-triage` is removed when that happens.
