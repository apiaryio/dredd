module DreddWorker
  module FileLoader
    def self.unique_paths globs
      paths = []
      globs.each do |glob|
        paths += Dir.glob glob
      end
      paths.uniq
    end

    def self.load globs
      puts Dir.pwd
      self.unique_paths(globs).each do |path|
        puts path
        require path
      end
    end
  end
end