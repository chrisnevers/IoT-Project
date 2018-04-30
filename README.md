# IOT Project - Chris Nevers

This project allows users to setup camera enabled Raspberry Pis on their home network and stream their video from anywhere. The cameras will detect motion while streaming and store snapshots. These images can be viewed online. The images will then be deleted after a fixed number of days. 

This project provides the web server and instructions needed to run the web application on your own machine (given the correct hardware).

# Software Inventory

### Node.js Web Server
- Utilizes the Express framework to create a Node.js web server
### Motion
- Raspberry Pi Zeros use the `motion` package for streaming videos
 and taking pictures
- Provides an extensive configuration file to tweak with camera and
storage settings
### AWS Connected
- Pub/Sub to AWS Topics
    - Web page updates in real time when message is received
- Integrated with AWS IOT Button
### MySQL Connected
- User Authentication
    - Tracks who is currently logged in
- Stores messages from AWS into DB
### RPIO (Raspberry GPIO)
- Node.js package with an extensive API that allows access to the Pi's GPIO ports
### Socket<span></span>.io
- Allows custom event emit/listen functionality
- Sends data to the web interface in real time
# Hardware Inventory
### Raspberry Pi
- Serves as the central node in the project's toplogy. This pi runs the web application. All access from outside the local network gets tunneled through this pi and is forked appropriately. The breakout board with the LEDs are attached to this pi.
### Rasperry Pi Zero (x2)
- These Pi's rock the cameras. Given their small size, they are convenient to place anywhere. 
### Cameras
- Camera video is streamed to a port on the Pi's localhost.
### Green and Red LED Lights
- Lights on breakout board provide convenient indication of whether the server is up and running successfully or has encountered an error.

# Value and Differentiation
The value of home security does not need to be explained. People steal online deliveries from a porch while the owner is at work. Parent's may want to keep an eye on their pets or children, especially newborns. The reality is we cannot always be home guarding our property. It is convenient to have the ability to monitor our things. 

This product differs from other similar products in that it is a very cheap alternative. Products such as Nest and Evercam can be very pricey. Part of that price is the inclusion of software that comes with the products. This project is released under open source and is therefore free to use and supplement with new features. 

# Installation

## Adding a New Camera

1. Install Raspbian OS on Raspberry Pi Zero.
2. Enable ssh and camera from raspi-config.
3. Install motion package:

        sudo apt-get install motion
4. Activate camera driver:

        sudo modprobe bcm2835-v4l2
5. Activate camera driver after every reboot:

        sudo vi /etc/modules
    At the end of the file add: `bcm2835-v4l2`
6. Enable motion server to run automatically:
        
        sudo vi /etc/default/motion

        start_motion_daemon=yes
7. Edit motion config file:

        sudo vi /etc/motion/motion.conf


        # Allow motion to run the daemon we've set earlier
        daemon on

        # we want to be able to access the stream outside off the Pi's localhost
        stream_localhost off

        # disable pictures and movies saving
        output_pictures off 
    
        ffmpeg_output_movies off

        # set the framerate of the stream (100 for higher quality)
        framerate 5
8. Reboot/run : `sudo service motion start`
9. In your home router page, forward a port to your main pi, e.g. 2500
10. Then on your main pi add the following to your /etc/rc.local file:

        socat TCP-LISTEN:2500,fork TCP:192.168.1.196:8081 &
    
    Where 

    2500 - the port you forwarded in your router.

    192.168.1.196 - the ip address of the new pi

    8081 - the port that the motion server is streaming on. (8081 by default)

    This will forward all incoming connections from port 2500 on the main pi to your new pi.
