#!/bin/sh

# This file is for you, the developer, to run while developing the code.  It automatically pushes
#   your new changes into couchdb whenever you save a file.

# . ../bin/activate

MODE="dev-local"
#MODE="dev-iriscouch"
#MODE="prod-local"
#MODE="prod-iriscouch"

if [ "$MODE" = 'dev-iriscouch' ];
then
  # # Development copy - arwd.iriscouch.com
  # # Get the admin username and password for couchdb
  LOGIN=$(cat login.txt)
  PORT=80
  HOST=arwd.iriscouch.com
  # HOST=arwd.cloudant.com
  DBNAME=rcl-dev;
fi

if [ "$MODE" = 'dev-local' ];
then
  # # Development copy - local
  # # Get the admin username and password for couchdb
  LOGIN=$(cat login.txt)
  PORT=5984
  HOST=localhost
  # HOST=arwd.cloudant.com
  DBNAME=rcl-dev;
fi;

if [ "$MODE" = 'prod-local' ];
then
  # Production copy
  # Get the admin username and password for couchdb
  LOGIN=$(cat login.txt)
  PORT=5984
  HOST=localhost
  DBNAME=rcl;
fi;

if [ "$MODE" = 'prod-iriscouch' ];
then
  # Production copy
  # Get the admin username and password for couchdb
  LOGIN=$(cat login.txt)
  PORT=80
  HOST=arwd.iriscouch.com
  DBNAME=rcl;
fi;

URL=http://$LOGIN@$HOST:$PORT/$DBNAME

# Create .couchapprc file if this has not been done yet
# TODO: erica loads .couchapprc.* so we need to rename this file to not start with the dot.
if [ ! -e .couchapprc ];
then
    cp couchapprc.template .couchapprc
    sed -i "s/username:password/$LOGIN/g" .couchapprc
    sed -i "s/5984/$PORT/g" .couchapprc
fi

# Push app into database in case this has not been done yet
erica push $URL
# couchapp push $URL

#echo "Starting the Node.js changes listener as a forked child process..."
#( ./_attachments/node_changes_listeners/start.sh & )
echo "Starting the Node.js changes listener as a background process..."
# It's in the background in order to allow iwatch to push new changes to the db
nodejs ./_attachments/node_changes_listeners/changes_listeners.js &

# You can run node-inspector like this:  node-inspector &

# TODO: If I start the node script from this file too, and run autopush in the background, 
#   I can use this example to kill the autopush process before killing this process:
#   http://hacktux.com/bash/control/c
# TODO: Here is how to start the forked process and kill it afterward:  http://hacktux.com/bash/ampersand
# Kill forked process
cleanup(){
  # TODO: Kill the Node.js process when killing this file's process.  This kill command doesn't work.
  #     It seems the problem is that $! is not recognized as the PID
  kill $!
  return $?
}

# run if user hits control-c
control_c(){
  printf "\n*** Exiting ***\n\n"
  cleanup
  exit $?
}

# trap keyboard interrupt (control-c)
trap control_c INT

# Launch the application in the browser
# erica browse rcl
xdg-open $URL/_design/rcl/index.html &

# Start watching the filesystem for changes, and push new changes into the database
# Avoid multiple pushes caused by text editors saving the file more than once.
inotifywait -mr . --exclude .git -e close_write --format '%w %e %T' --timefmt '%H%M%S' | while read file event tm; do
    current=$(date +'%H%M%S')
    delta=`expr $current - $tm`
    if [ $delta -lt 2 -a $delta -gt -2 ] ; then
        sleep 1  # sleep 1 second to let file operations end
        ~/bin/erica push $URL
    fi
done
