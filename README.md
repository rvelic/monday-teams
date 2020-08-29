# Teams (monday.com)

[![button](https://dapulse-res.cloudinary.com/image/upload/f_auto,q_auto/remote_mondaycom_static/uploads/Tal/4b5d9548-0598-436e-a5b6-9bc5f29ee1d9_Group12441.png)](https://auth.monday.com/oauth2/authorize?client_id=ae7d5eccd8c37edc73c97f10f8a90757&response_type=install)

## Inspiration

Teams is essential app for remote teams working across multiple timezones and/or working in multiple shifts.

## What it does

The app shows visual representation of your teams' working hours and everyone in those teams. You can easily see if your teams cover full 24 hours, where they overlap and where you have gaps to fill. You can "assign" team to all items on your board with single click e.g. to handover work from one shift to another. You can also choose to assign a random member from selected team to those items. You can add Teams Widget for each of your teams and the widget will show you statistics on number of handovers between columns you configured and top/bottom performers. The app has no opinion about how you should use it or monday.com, so it's up to you - the more information you provide in settings, the richer your experience will be.

## How I built it

Teams is build as a react app providing board view and a dashboard widget.

## What's next for Teams

Integration - automatic start & end of shifts.

## Run the project

In the project directory, you should run:

### `npm install`

And then to run an application with automatic virtual ngrok tunnel, run:

### `npm start`

Visit http://localhost:4040/status and under "command_line section" find the URL. This is the public URL of your app, so you can use it to test it.
F.e.: https://021eb6330099.ngrok.io

## Configure Monday App 

1. Open monday.com, login to your account and go to a "Developers" section.
2. Create a new "QuickStart View Example App"
3. Open "OAuth & Permissions" section and add "boards:read" scope
4. Open "Features" section and create a new "Boards View" feature
5. Open "View setup" tab and fulfill in "Custom URL" field your ngrok public URL, which you got previously (f.e. https://021eb6330099.ngrok.io)
6. Click "Boards" button and choose one of the boards with some data in it.
7. Click "Preview button"
8. Enjoy the Quickstart View Example app!

## Release your app
1. Run script
### `npm run build`
2. Zip your "./build" folder
3. Open "Build" tab in your Feature
4. Click "New Build" button
5. Click "Upload" radio button and upload zip file with your build
6. Go to any board and add your just released view
7. Enjoy!
