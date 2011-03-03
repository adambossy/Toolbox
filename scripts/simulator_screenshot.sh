#!/bin/sh

# script to screenshot the iPhone Simulator to the correct size
# to upload to iTunes Connect
# written by Jehiah Czebotar http://jehiah.cz/
# located at https://bitbucket.org/jehiah/jehiah-scripts/src/tip/sdk_screenshot.sh

OUTPUTDIR=~/Desktop
TEMPFILE=iPhoneSimulatorScreenshot_`date +%Y%m%d_%H%M%S`.png

echo "output filename:\c"
read -e OUTPUTFILE

# activate iPhone Simulator so it's easy to click on 
osascript -e 'tell application "iPhone Simulator"' -e 'activate' -e 'end tell'

# capture the screen
screencapture -iowW $OUTPUTDIR/$TEMPFILE 

# resize to the apple upload size, 320x480
sips -c 480 320 $OUTPUTDIR/$TEMPFILE --out $OUTPUTDIR/$OUTPUTFILE

# resize to something else, say 176x260
#sips -z 260 176 $OUTPUTDIR/$TEMPFILE --out $OUTPUTDIR/$OUTPUTFILE
