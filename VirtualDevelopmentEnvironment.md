## Virtual development environment

It's recomended to use [Vagrant][] and [VirtualBox][] in order to achieve consistent development environment across all contributors.

### Installation

- Download and install latest [VirtualBox][]
- Download and install latest [Vagrant][]
- Clone GitHub repo:
    
    ```
    $ git clone git@github.com:apiaryio/dredd.git
    $ cd dredd
    ```
- Import the vagrant box:
    
    ```
    $ vagrant box add precise64 http://files.vagrantup.com/precise64.box
    ```
- Start virtual development environment:
    
    ```
    $ vagrant up
    ```
Please notice that you may be promted to enter your root password due to exporting shared folder over NFS to the virtual machine.
- SSH to the virtual development environment:
    
    ```
    $ vagrant ssh
    ```
- You will find your project shared in `/vagrant` inside the virtual envinronment
    
    ```
    $ cd /vagrant
    ```
- Use your favorite local editor in your local folder to edit the code and run tests in the virtual environment
    
    ```
    $ npm install && npm test
    ```


[Vagrant]: http://www.vagrantup.com/
[VirtualBox]: https://www.virtualbox.org/
