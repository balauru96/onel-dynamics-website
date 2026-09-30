# Logs

Task logs are written here, one file per run:

    tasks/logs/<id>-<timestamp>.log

Bounded: at most 20 files and 2 MB total are kept, oldest pruned first.
No credentials are written. The runner redacts anything that looks like a
token before a line reaches the log.

Inspect with:

    tail -f tasks/logs/<id>-*.log
    journalctl --user -u onel-website-agent -n 100
