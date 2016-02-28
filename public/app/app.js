angular.module('stockkings', ['ui.router'])
  .config(function($stateProvider, $urlRouterProvider){
    console.log("Hello from Angular")

    $urlRouterProvider.otherwise('/home');

    $stateProvider.state('home', {
      templateUrl: 'templates/home.html',
      controller: 'HomeController',
      url: '/home'
    }).state('about', {
      templateUrl: 'templates/about.html',
      controller: 'AboutController',
      url: '/about'
    }).state('research', {
      templateUrl: 'templates/research.html',
      controller: 'ResearchController',
      url:'/research'
    }).state('standings', {
      templateUrl: 'templates/standings.html',
      controller: 'StandingsController',
      url:'/standings'
    }).state('support', {
      templateUrl: 'templates/support.html',
      controller: 'SupportController',
      url:'/support'
    })
  });
