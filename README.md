# Healthtrack User Manual

Healthtrack is based upon the databox platform and has the following dependencies:

* [Docker](https://docs.docker.com/install/)
* [Git](https://git-scm.com/)
* [Moves Account](https://moves-app.com/) with a stored location history.
* [Fitbit Account](https://www.fitbit.com/) with a stored heart rate history.

## Installing the components

### Databox

Once you have installed Docker and Git, you will be able to install the databox platform. 

1. Clone the databox project: `git clone https://github.com/me-box/databox.git`
2. Navigate into the databox directory: `cd databox`
3. Start the databox system: `./databox-start`

The databox system will now be available at [http://localhost], follow the prompts to secure the website and accept the certifcates.

### Healthtrack

With the databox system running, navigate to the databox directory and run the following commands:

1. Install the Moves driver: `./databox-install-component psyaoc/databox-driver-moves`
2. Install the FitbitHR driver: `./databox-install-component psyaoc/databox-driver-fitbithr`
3. Install the Healthtrack application: `./databox-install-component psyaoc/databox-app-healthtrack`

Once all three commands have executed, navigate to [Driver Store](https://localhost/#!/driver/store) and install both of the drivers.
**Note:** If you cannot see the drivers within the store please navigate to the [App List](https://localhost:8181/app/list) and accept the certificate.


## Configuration

### Drivers

Both of the drivers work in a similar way and can be accessed through the [Installed Drivers Panel](https://localhost/#!/driver/installed), to set up each driver you need to do the following:

1. Select a driver to open the settings panel for that interface or navigate to [Moves Driver Settings](https://localhost/#!/databox-driver-moves/ui) or [Fitbit Driver Settings](https://localhost/#!/databox-driver-fitbithr/ui)
2. Enter your Client ID/Secret, these need to be generated through a [Moves API Account](https://dev.moves-app.com/) or [Fitbit API Account](https://dev.fitbit.com/apps/new)
  1. **Note**: Please select the 'Personal' application type when creating Fitbit credentials
3. Follow the prompts to allow the driver to authenticate with your account, this may include entering a code on the Moves mobile application.

### Application

Once both of the drivers have been authenticated, you are ready to set up the application.

1. Navigate to the [App Store](https://localhost/#!/driver/app) and select the option to install the application.
2. Accept both of the data requests, you do this by clicking both of the boxes requesting "Moves Location History" and "Fitbit Heart Rate History", they will become checked when you do so.
3. Select both of the available data soruces from the dropdown boxes which have became available 
4. Install the application

## Running the application 

1. Navigate to [Installed Applications](https://localhost/#!/app/installed) and select "databox healthtrack"

You will now see an interface displaying a range of features, to see what is available please view the image here: [Overview Image](https://github.com/psyaoc/databox-app-healthtrack/blob/master/overview.png)
