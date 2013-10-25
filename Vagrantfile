# Vagrantfile API/syntax version. Don't touch unless you know what you're doing!
VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "precise64"
  
  config.vm.provision "shell", path: "provisioning.sh"
  
  config.vm.network :private_network, ip: "10.3.3.3"

  config.vm.provider :virtualbox do |vb|
    vb.customize ["modifyvm", :id, "--memory", "1024"]
  end
  
  config.vm.synced_folder ".", "/vagrant", nfs: true
end
