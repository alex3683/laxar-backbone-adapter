/**
 * Copyright 2015 Alexander Wilden
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'laxar',
   'backbone'
], function( ax, backbone ) {
   'use strict';

   var widgetModules = {};
   function bootstrap( modules ) {
      modules.forEach( function( module ) {
         widgetModules[ module.name ] = module;
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function create( environment ) {

      var exports = {
         createController: createController,
         domPrepare: domPrepare,
         domAttachTo: domAttachTo,
         domDetach: domDetach,
         widgetId: widgetId,
         destroy: destroy
      };

      var context = environment.context;
      var moduleName = environment.specification.name.replace( /^./, function( _ ) { return _.toLowerCase(); } );

      var backboneApp_ = null;
      var hasDom_ = false;
      var backboneViewDefinition = null;
      var assetUrlPromise_ = null;

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function createController() {
         var module = widgetModules[ moduleName ];
         var injector = createInjector();
         var injections = ( module.injections || [] ).map( function( injection ) {
            return injector.get( injection );
         } );

         backboneViewDefinition = module.create.apply( module, injections );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function domPrepare() {
         if( !assetUrlPromise_ ) {
            assetUrlPromise_ = environment.assetResolver.resolve();

            if( environment.specification.integration.type === 'activity' ) {
               environment.anchorElement = null;
               render();
               return assetUrlPromise_;
            }

            return assetUrlPromise_
               .then( function( urls ) {
                  urls.cssFileUrls.forEach( function( url ) {
                     environment.assetResolver.loadCss( url );
                  } );

                  if( urls.templateUrl ) {
                     hasDom_ = true;
                     return environment.assetResolver.provide( urls.templateUrl )
                        .then( function( templateHtml ) {
                           environment.anchorElement.innerHTML = templateHtml;
                        } );
                  }
               } )
               .finally( render );
         }

         return assetUrlPromise_;

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function render() {
            backboneApp_ = backbone.View.extend( ax.object.options( backboneViewDefinition, {
               el: environment.anchorElement
            } ) );
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function domAttachTo( areaElement ) {
         areaElement.appendChild( environment.anchorElement );
         // backbone likes constructors and inheritance. We respect this here as much as necessary ;-)
         /* jshint newcap: false, nonew: false */
         new backboneApp_();
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function domDetach() {
         environment.anchorElement.parentNode.removeChild( environment.anchorElement );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function widgetId() {
         return context.widget.id;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function destroy() {
         environment.release();
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function createInjector() {

         var map = {
            axEventBus: context.eventBus,
            axFeatures: context.features || {},
            axId: context.id,
            axWidget: context.widget
         };

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         return {
            get: function( name ) {
               if( !( name in map ) ) {
                  throw new Error( 'Unknown dependency "' + name + '".' );
               }

               return map[ name ];
            }
         };

      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      return exports;

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      technology: 'backbone',
      create: create,
      bootstrap: bootstrap
   };

} );
