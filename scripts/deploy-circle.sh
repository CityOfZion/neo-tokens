#!/bin/sh
# ideas used from https://gist.github.com/motemen/8595451

# Based on https://github.com/eldarlabs/ghpages-deploy-script/blob/master/scripts/deploy-ghpages.sh
# Used with their MIT license https://github.com/eldarlabs/ghpages-deploy-script/blob/master/LICENSE

# abort the script if there is a non-zero error
set -e

# show where we are on the machine
pwd

remote=$(git config remote.origin.url)

siteSource="$1"

if [ ! -d "$siteSource" ]
then
    echo "Usage: $0 <site source dir>"
    exit 1
fi

# make a directory to put the circle-branch branch
mkdir circle-branch
cd circle-branch
# now lets setup a new repo so we can update the github branch
git config --global user.email "$GH_EMAIL" > /dev/null 2>&1
git config --global user.name "$GH_NAME" > /dev/null 2>&1
git init
git remote add --fetch origin "$remote"

# switch into the gh-pages branch
if git rev-parse --verify origin/circle-branch > /dev/null 2>&1
then
    git checkout circle-branch
    # delete any old site as we are going to replace it
    # Note: this explodes if there aren't any, so moving it here for now
    git rm -rf .
else
    git checkout --orphan circle-branch
fi

# copy over or recompile the new site
cp -a "../${siteSource}/." .

# stage any changes and new files
git add -A
# now commit, ignoring branch gh-pages doesn't seem to work, so trying skip
git commit --allow-empty -m "Deploy to GitHub for neo tokens repo"
# and push, but send any output to /dev/null to hide anything sensitive
git push --force --quiet origin master
# go back to where we started and remove the gh-pages git repo we made and used
# for deployment
cd ..
rm -rf circle-branch

echo "Finished Deployment!"
