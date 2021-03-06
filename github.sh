#!/bin/bash

### Control that the script is run on `dev` branch
branch=`git rev-parse --abbrev-ref HEAD`
if [[ ! "$branch" = "master" ]] && [[ ! "$branch" =~ ^release/[0-9]+.[0-9]+.[0-9]+(-(alpha|beta|rc)[0-9]+)?$ ]];
then
  echo ">> This script must be run under \`master\` or a \`release\` branch"
  exit 1
fi

### Get version to release
current=`grep -P "version\": \"\d+.\d+.\d+(-(\w+)[0-9]+)" package.json | grep -m 1 -oP "\d+.\d+.\d+(-(\w+)[0-9]+)"`
if [[ "_$version" != "_" ]]; then
  echo "ERROR: Unable to read 'version' in the file 'package.json'."
  echo " - Make sure the file 'package.json' exists and is readable."
  exit 1
fi
echo "Current version: $current"

### Get repo URL
PROJECT_NAME=sumaris-app
REMOTE_URL=`git remote -v | grep -P "push" | grep -oP "(https:\/\/github.com\/|git@github.com:)[^ ]+"`
REPO=`echo $REMOTE_URL | sed "s/https:\/\/github.com\///g" | sed "s/git@github.com://g" | sed "s/.git$//"`
REPO_API_URL=https://api.github.com/repos/$REPO
REPO_PUBLIC_URL=https://github.com/$REPO

###  get auth token
GITHUB_TOKEN=`cat ~/.config/${PROJECT_NAME}/.github`
if [[ "_$GITHUB_TOKEN" != "_" ]]; then
    GITHUT_AUTH="Authorization: token $GITHUB_TOKEN"
else
    echo "ERROR: Unable to find github authentication token file: "
    echo " - You can create such a token at https://github.com/settings/tokens > 'Generate a new token'."
    echo " - Then copy the token and paste it in the file '~/.config/${PROJECT_NAME}/.github' using a valid token."
    exit 1
fi

case "$1" in
  del)
    result=`curl -i "$REPO_API_URL/releases/tags/$current"`
    release_url=`echo "$result" | grep -P "\"url\": \"[^\"]+"  | grep -oP "$REPO_API_URL/releases/\d+"`
    if [[ $release_url != "" ]]; then
        echo "Deleting existing release..."
        curl -H 'Authorization: token $GITHUB_TOKEN'  -XDELETE $release_url
    fi
  ;;

  pre|rel)
    if [[ "_$2" != "_" ]]; then

      if [[ $1 = "pre" ]]; then
        prerelease="true"
      else
        prerelease="false"
      fi

    description=`echo $2`
    if [[ "_$description" = "_" ]]; then
        description="Release $current"
    fi

      result=`curl -s -H ''"$GITHUT_AUTH"'' "$REPO_API_URL/releases/tags/$current"`
      release_url=`echo "$result" | grep -P "\"url\": \"[^\"]+" | grep -oP "https://[A-Za-z0-9/.-]+/releases/\d+"`
      if [[ "_$release_url" != "_" ]]; then
        echo "Deleting existing release... $release_url"
        result=`curl -H ''"$GITHUT_AUTH"'' -s -XDELETE $release_url`
        if [[ "_$result" != "_" ]]; then
            error_message=`echo "$result" | grep -P "\"message\": \"[^\"]+" | grep -oP ": \"[^\"]+\""`
            echo "Delete existing release failed with error$error_message"
            exit 1
        fi
      else
        echo "Release not exists yet on github."
      fi

      echo "Creating new release..."
      echo " - tag: $current"
      echo " - description: $description"
      result=`curl -H ''"$GITHUT_AUTH"'' -s $REPO_API_URL/releases -d '{"tag_name": "'"$current"'","target_commitish": "master","name": "'"$current"'","body": "'"$description"'","draft": false,"prerelease": '"$prerelease"'}'`
      upload_url=`echo "$result" | grep -P "\"upload_url\": \"[^\"]+"  | grep -oP "https://[A-Za-z0-9/.-]+"`

      if [[ "_$upload_url" = "_" ]]; then
        echo "Failed to create new release for repo $REPO."
        echo "Server response:"
        echo "$result"
        exit 1
      fi

      ###  Sending files
      echo "Uploading files to ${upload_url} ..."
      DIRNAME=$(pwd)

      ZIP_FILE="$DIRNAME/dist/${PROJECT_NAME}.zip"
      if [[ -f "${ZIP_FILE}" ]]; then
        artifact_name="${PROJECT_NAME}-${current}-web.zip"
        result=$(curl -s -H ''"$GITHUT_AUTH"'' -H 'Content-Type: application/zip' -T "${ZIP_FILE}" "${upload_url}?name=${artifact_name}")
        browser_download_url=$(echo "$result" | grep -P "\"browser_download_url\":[ ]?\"[^\"]+" | grep -oP "\"browser_download_url\":[ ]?\"[^\"]+"  | grep -oP "https://[A-Za-z0-9/.-]+")
        ZIP_SHA256=$(sha256sum "${ZIP_FILE}" | sed 's/ /\n/gi' | head -n 1)
        echo " - ${browser_download_url}  | SHA256 Checksum: ${ZIP_SHA256}"
        echo "${ZIP_SHA256}  ${artifact_name}" > "${ZIP_FILE}.sha256"
        result=$(curl -s -H ''"$GITHUT_AUTH"'' -H 'Content-Type: text/plain' -T "${ZIP_FILE}.sha256" "${upload_url}?name=${artifact_name}.sha256")
      else
        echo " - ERROR: Web release (ZIP) not found! Skipping."
      fi

      APK_FILE="${DIRNAME}/platforms/android/app/build/outputs/apk/release/app-release.apk"
      if [[ -f "${APK_FILE}" ]]; then
        artifact_name="${PROJECT_NAME}-${current}-android.apk"
        result=$(curl -s -H ''"$GITHUT_AUTH"'' -H 'Content-Type: application/vnd.android.package-archive' -T "${APK_FILE}" "${upload_url}?name=${artifact_name}")
        browser_download_url=$(echo "$result" | grep -P "\"browser_download_url\":[ ]?\"[^\"]+" | grep -oP "\"browser_download_url\":[ ]?\"[^\"]+"  | grep -oP "https://[A-Za-z0-9/.-]+")
        APK_SHA256=$(sha256sum "${APK_FILE}" | sed 's/ /\n/gi' | head -n 1)
        echo " - ${browser_download_url}  | SHA256 Checksum: ${APK_SHA256}"
        echo "${APK_SHA256}  ${artifact_name}" > "${APK_FILE}.sha256"
        result=$(curl -s -H ''"$GITHUT_AUTH"'' -H 'Content-Type: text/plain' -T "${APK_FILE}.sha256" "${upload_url}?name=${artifact_name}.sha256")
      else
        echo "- ERROR: Android release (APK) not found! Skipping."
      fi

      echo "-----------------------------------------"
      echo "Successfully uploading files !"
      echo " -> Release url: ${REPO_PUBLIC_URL}/releases/tag/${current}"
      exit 0
    else
      echo "Wrong arguments"
      echo "Usage:"
      echo " > ./github.sh del|pre|rel <release_description>"
      echo "With:"
      echo " - del: delete existing release"
      echo " - pre: use for pre-release"
      echo " - rel: for full release"
      exit 1
    fi
    ;;
  *)
    echo "No task given"
    exit 1
    ;;
esac
