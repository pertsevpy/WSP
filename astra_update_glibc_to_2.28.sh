#!/bin/bash

# Update glibc in Astra Linux 1.6 to version 2.28

mkdir /tmp/install_glibc/
cd /tmp/install_glibc/
wget http://archive.debian.org/debian/pool/main/g/glibc/libc6_2.28-10+deb10u1_amd64.deb
wget http://archive.debian.org/debian/pool/main/g/glibc/locales_2.28-10+deb10u1_all.deb
wget http://archive.debian.org/debian/pool/main/g/glibc/libc-l10n_2.28-10+deb10u1_all.deb
wget http://archive.debian.org/debian/pool/main/g/glibc/libc-bin_2.28-10+deb10u1_amd64.deb
wget http://archive.debian.org/debian/pool/main/g/glibc/libc-dev-bin_2.28-10+deb10u1_amd64.deb
wget http://archive.debian.org/debian/pool/main/g/glibc/libc6-dev_2.28-10+deb10u1_amd64.deb
wget http://archive.debian.org/debian/pool/main/g/glibc/libc6-dbg_2.28-10+deb10u1_amd64.deb
wget http://archive.debian.org/debian/pool/main/g/glibc/libc6-i386_2.28-10+deb10u1_amd64.deb
wget http://archive.debian.org/debian/pool/main/g/glibc/libc6-x32_2.28-10+deb10u1_amd64.deb
wget http://archive.debian.org/debian/pool/main/g/glibc/libc6-dev-i386_2.28-10+deb10u1_amd64.deb
wget http://archive.debian.org/debian/pool/main/g/glibc/libc6-dev-x32_2.28-10+deb10u1_amd64.deb

sudo dpkg -i libc-bin*
sudo dpkg -i *.deb
