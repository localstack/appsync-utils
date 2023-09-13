#!/usr/bin/env python

import urllib.request
import os
import tempfile
import subprocess as sp
import shutil
import tarfile

PACKAGE_NAME = "@aws-appsync/utils"


# Fetch source tarball
download_url = sp.check_output(["npm", "view", PACKAGE_NAME, "dist.tarball"]).decode().strip()
with tempfile.NamedTemporaryFile(suffix=".tar.gz") as tfile:
    urllib.request.urlretrieve(download_url, filename=tfile.name)
    tfile.seek(0)

    with tempfile.TemporaryDirectory() as output_dir:

        with tarfile.open(tfile.name) as infile:
            for member in infile.getmembers():
                if not member.name.startswith("package/lib/"):
                    continue
                if member.name.endswith(".js"):
                    continue
                if member.name.endswith(".map"):
                    continue

                infile.extract(member, path=output_dir)

        shutil.move(os.path.join(output_dir, "package", "lib"), ".")



# Unpack to temporary directory
# Copy source files into project dir
# Compile

# set -euo pipefail

# set -x

# DOWNLOAD_URL=$(npm view @appsync/utils dist.tarball)
# TARBALL_NAME=
# TDIR=$(mktemp -d)

# # don't rm -rf /!
# if test -z "${TDIR}"; then
#     echo "No temp dir set; cannot continue" >&2
#     exit 1
# fi
# trap "rm -rf ${TDIR}" EXIT

# (cd $TDIR; curl -LO ${DOWNLOAD_URL})
