#!/bin/bash

source lib.sh

# Requires imagemagick
for var in "$@"
do
  var1x=${var/\@2x/}
	convert $var -filter Box -resize 50% -background white $var1x
  echo "wrote ${var1x}."

  var1_5x=${var1x}
  append_1_5x ${var1_5x}
	convert $var -filter Box -resize 75% -background white $__file
  echo "wrote $__file."
done
