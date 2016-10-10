# Virtual Development Environment

It's recommended to use [Vagrant][] and [VirtualBox][] in order to achieve
consistent development environment across all contributors.

## Installation

1.  Download and install latest [VirtualBox][].
2.  Download and install latest [Vagrant][].
3.  Clone GitHub repo:

    ```shell
    $ git clone https://github.com/apiaryio/dredd
    $ cd dredd
    ```

4.  Import the Vagrant box:

    ```shell
    $ vagrant box add precise64 http://files.vagrantup.com/precise64.box
    ```

5.  Start virtual development environment:

    ```shell
    $ vagrant up
    ```

    > **Note:** You may be prompted to enter your root password due
    > to exporting shared folder over NFS to the virtual machine.

6.  SSH to the virtual development environment:

    ```shell
    $ vagrant ssh
    ```

7.  You will find your project shared in `/vagrant` inside the virtual environment:

    ```shell
    $ cd /vagrant
    ```

8.  Use your favorite local editor in your local folder to edit the code and
    run tests in the virtual environment:

    ```shell
    $ npm install && npm test
    ```


[Vagrant]: http://www.vagrantup.com/
[VirtualBox]: https://www.virtualbox.org/
