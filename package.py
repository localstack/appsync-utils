#!/usr/bin/env python

import urllib.request
import os
import glob
import tempfile
import subprocess as sp
import shutil
import tarfile

PACKAGE_NAME = "@aws-appsync/utils"


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

        shutil.rmtree("./lib", ignore_errors=True)
        shutil.move(os.path.join(output_dir, "package", "lib"), ".")

# apply patches
patch_files = sorted(glob.glob("patches/*.patch"))
for patch_file in patch_files:
    cmd = ["patch", "-p1", "-i", patch_file]
    sp.check_call(cmd)
