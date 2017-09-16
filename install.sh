#!/bin/sh
./build.sh
rm -rf ~/.local/share/gnome-shell/extensions/shade-inactive-windows@nyxcode.de
cp -avr . ~/.local/share/gnome-shell/extensions/shade-inactive-windows@nyxcode.de
