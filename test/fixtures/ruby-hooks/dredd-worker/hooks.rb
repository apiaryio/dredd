module DreddWorker
  module Hooks
    @@before_hooks = {}
    @@before_validation_hooks = {}
    @@after_hooks = {}

    @@before_each_hooks = []
    @@before_each_validation_hooks = []
    @@after_each_hooks = []

    @@before_all_hooks = []
    @@after_all_hooks = []

    #
    # Ruby hooks API
    #

    def before transaction_name, &block
      @@before_hooks[transaction_name] = [] if @@before_hooks[transaction_name].nil?
      @@before_hooks[transaction_name].push block
    end

    def before_validation transaction_name, &block
      @@before_validation_hooks[transaction_name] = [] if @@before_validation_hooks[transaction_name].nil?
      @@before_validation_hooks[transaction_name].push block
    end

    def after transaction_name, &block
      @@after_hooks[transaction_name] = [] if @@after_hooks[transaction_name].nil?
      @@after_hooks[transaction_name].push block
    end

    def before_each &block
      @@before_each_hooks.push block
    end

    def before_each_validation &block
      @@before_each_validation_hooks.push block
    end

    def after_each &block
      @@after_each_hooks.push block
    end

    def before_all &block
      @@before_all_hooks.push block
    end

    def after_all &block
      @@after_all_hooks.push block
    end
  end
end