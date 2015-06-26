module DreddWorker
  module Runner

    #
    # Runers for Transaction specific hooks
    #

    def self.run_before_hooks_for_transaction transaction
      transaction_name = transaction["name"]
      hooks = Hooks.class_variable_get("@@before_hooks")[transaction_name]
      if hooks.kind_of? Array
        hooks.each do |hook_proc|
          hook_proc.call transaction
        end
      end
      return transaction
    end

    def self.run_before_validation_hooks_for_transaction transaction
      transaction_name = transaction["name"]
      hooks = Hooks.class_variable_get("@@before_validation_hooks")[transaction_name]
      if hooks.kind_of? Array
        hooks.each do |hook_proc|
          hook_proc.call transaction
        end
      end
      return transaction
    end

    def self.run_after_hooks_for_transaction transaction
      transaction_name = transaction["name"]
      hooks = Hooks.class_variable_get("@@after_hooks")[transaction_name]
      if hooks.kind_of? Array
        hooks.each do |hook_proc|
          hook_proc.call transaction
        end
      end
      return transaction
    end

    #
    # Runners for *_each hooks API
    #

    def self.run_before_each_hooks_for_transaction transaction
      Hooks.class_variable_get("@@before_each_hooks").each do |hook_proc|
        hook_proc.call transaction
      end
      return transaction
    end

    def self.run_before_each_validation_hooks_for_transaction transaction
      Hooks.class_variable_get("@@before_each_validation_hooks").each do |hook_proc|
        hook_proc.call transaction
      end
      return transaction
    end

    def self.run_after_each_hooks_for_transaction transaction
      Hooks.class_variable_get("@@after_each_hooks").each do |hook_proc|
        hook_proc.call transaction
      end
      return transaction
    end

    #
    # Runners for *_all hooks API
    #

    def self.run_before_all_hooks_for_transactions transactions
      Hooks.class_variable_get("@@before_all_hooks").each do |hook_proc|
        hook_proc.call transactions
      end
      return transactions
    end

    def self.run_after_all_hooks_for_transactions transactions
      Hooks.class_variable_get("@@after_all_hooks").each do |hook_proc|
        hook_proc.call transactions
      end
      return transactions
    end
  end
end