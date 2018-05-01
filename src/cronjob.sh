#!/bin/bash
daysKept=7
echo "Removing files from image directories that are $daysKept days old."
eval "sudo find ../public/images/ -type f -mtime +$daysKept -delete"
