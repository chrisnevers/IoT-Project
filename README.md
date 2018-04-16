# IoT-Project
This project uses Express to run an IoT web application.

This project allows users to setup camera enabled Raspberry Pis on their home network and stream there anywhere.

Functionality
======

### AWS Connected
- Pub/Sub to AWS Topics
    - Web page updates in real time when message is received
- Integrated with AWS IOT Button

### MySQL Connected
- User Authentication
    - Tracks who is currently logged in
- Stores messages from AWS into DB.
### Raspberry GPIO
- Blinking Green Light
    - Indicates smooth sailing
- Blinking Red Light
    - Indicates error


Adding a New Camera
======

1. Boot Raspberry Pi Zero with Raspbian OS.
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
