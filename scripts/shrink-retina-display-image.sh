#!/bin/bash

# Requires imagemagick

for var in "$@"
do
	imagemagick $var -filter Box -resize 50% ${var/\@2x/}
done
