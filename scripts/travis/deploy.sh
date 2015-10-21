#!/bin/sh

openssl aes-256-cbc -K $encrypted_95fb4ca130b1_key -iv $encrypted_95fb4ca130b1_iv -in scripts/travis/id_rsa.enc -out ~/.ssh/id_rsa -d
npm i -g npm@^2.0.0
npm install -g gulp
npm install gulp
npm install
npm install -g bower
bower install

# Run gulp task to prep for deployment, and commit dist directory to git

echo "Running gulp default..."
gulp default
git add .
git commit -am "add dist directory"

# Copy files to production server

eval "$(ssh-agent -s)" #start the ssh agent
# chmod 600 ~/.ssh/id_dsa # this key should have push access
# ssh-add ~/.ssh/id_dsa
chmod 600 ~/.ssh/id_rsa # this key should have push access
ssh-add ~/.ssh/id_rsa
# Add RSA key fingerprint to known_hosts
echo "|1|Ir1HlMdB5oucEii9jvTIbRuY1TU=|sVHs8cU0jpD/AHbahW80xtZmsSs= ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEA3V+waEkDMazM7oWm3dpqr8YXMUD86NJgcOl2N9UkPQmozqnHVvrFhABoEwnFb3oreTRrXG/NTyevpvs7eOwWzXkBvGHCwcr70CISWM3do9KreQBBKoYFXW5fUe2/z2wYwrLydPMsnKUBtyiSggsOdWRBnJYI4M0Wdh49TnhNktVbV+i2N/FQnGUNTm/YwI3Lykjy7qMIE8WUMeifpHh3md8c51WK8gzIqsjej614uWFn4q0LqRx2QhpvLKHVicUfACzkF3GfHQ9xlhdCgWqYoaI6ECS9JeZKKFOXIgfidBWZqKniQUrQFgNL2dLIWROE8yFEpxUUhQyfLI4wzqFiow==" >> /home/travis/.ssh/known_hosts
echo "|1|eZKvaQkJbjGWGyjif5TyoyL/DIM=|jovNrJJ321mWuKjSaziYNuSPOFY= ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEA3V+waEkDMazM7oWm3dpqr8YXMUD86NJgcOl2N9UkPQmozqnHVvrFhABoEwnFb3oreTRrXG/NTyevpvs7eOwWzXkBvGHCwcr70CISWM3do9KreQBBKoYFXW5fUe2/z2wYwrLydPMsnKUBtyiSggsOdWRBnJYI4M0Wdh49TnhNktVbV+i2N/FQnGUNTm/YwI3Lykjy7qMIE8WUMeifpHh3md8c51WK8gzIqsjej614uWFn4q0LqRx2QhpvLKHVicUfACzkF3GfHQ9xlhdCgWqYoaI6ECS9JeZKKFOXIgfidBWZqKniQUrQFgNL2dLIWROE8yFEpxUUhQyfLI4wzqFiow==" >> /home/travis/.ssh/known_hosts
git remote add deploy timblack1@timblack1.webfactional.com:webapps/rcl
echo "Pushing to master on production server..."
git push deploy master

# Update npm dependencies on production server

echo "Updating npm dependencies on production server..."
ssh -vvv timblack1@timblack1.webfactional.com 'cd webapps/rcl && npm update'

# Restart app on production server

echo "Restarting app on production server..."
ssh timblack1@timblack1.webfactional.com 'cd webapps/rcl && npm run start-production''