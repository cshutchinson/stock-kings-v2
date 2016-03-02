angular.module('stockkings')
  .controller('HomeController', HomeController)
  .controller('AboutController', AboutController)
  .controller('ResearchController', ResearchController)
  .controller('StandingsController', StandingsController)
  .controller('SupportController', SupportController);

  HomeController.$inject = ['$scope'];

  function HomeController($scope){}
