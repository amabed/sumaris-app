import {Injectable, NgModule} from '@angular/core';
import {ActivatedRouteSnapshot, ExtraOptions, RouteReuseStrategy, RouterModule, Routes} from '@angular/router';
import {HomePage} from './core/home/home';
import {RegisterConfirmPage} from './core/register/confirm/confirm';
import {AccountPage} from './core/account/account';
import {TripPage, TripTable} from './trip/trip.module';
import {OperationPage} from './trip/operation/operation.page';
import {ObservedLocationPage} from "./trip/observedlocation/observed-location.page";
import {ObservedLocationsPage} from "./trip/observedlocation/observed-locations.page";
import {SettingsPage} from "./core/settings/settings.page";
import {LandingPage} from "./trip/landing/landing.page";
import {AuctionControlPage} from "./trip/auctioncontrol/auction-control.page";
import {IonicRouteStrategy} from "@ionic/angular";
import {AuthGuardService} from "./core/services/auth-guard.service";
import {LandedTripPage} from "./trip/landedtrip/landed-trip.page";

const routeOptions: ExtraOptions = {
  enableTracing: false,
  //enableTracing: !environment.production,
  useHash: false
};

const routes: Routes = [
  // Core path
  {
    path: '',
    component: HomePage
  },

  {
    path: 'home/:action',
    component: HomePage
  },
  {
    path: 'confirm/:email/:code',
    component: RegisterConfirmPage
  },
  {
    path: 'account',
    pathMatch: 'full',
    component: AccountPage,
    canActivate: [AuthGuardService]
  },
  {
    path: 'settings',
    pathMatch: 'full',
    component: SettingsPage
  },

  // Admin
  {
    path: 'admin',
    canActivate: [AuthGuardService],
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
  },

  // Referential
  {
    path: 'referential',
    canActivate: [AuthGuardService],
    loadChildren: () => import('./referential/referential.module').then(m => m.ReferentialModule)
  },

  // Trip path
  {
    path: 'trips',
    canActivate: [AuthGuardService],
    data: {
      profile: 'USER'
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: TripTable
      },
      {
        path: ':tripId',
        runGuardsAndResolvers: 'pathParamsChange',
        data: {
          pathIdParam: 'tripId'
        },
        children: [
          {
            path: '',
            pathMatch: 'full',
            component: TripPage,
            runGuardsAndResolvers: 'pathParamsChange'
          },
          {
            path: 'operations/:operationId',
            runGuardsAndResolvers: 'pathParamsChange',
            data: {
              pathIdParam: 'operationId'
            },
            children: [
              {
                path: '',
                pathMatch: 'full',
                component: OperationPage,
                runGuardsAndResolvers: 'pathParamsChange'
              }
            ]
          }
        ]
      },

      {
        path: ':tripId/landing/:landingId',
        component: LandingPage,
        runGuardsAndResolvers: 'pathParamsChange',
        data: {
          profile: 'USER',
          pathIdParam: 'landingId'
        }
      }
    ]
  },

  // Observations path
  {
    path: 'observations',
    canActivate: [AuthGuardService],
    data: {
      profile: 'USER'
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: ObservedLocationsPage
      },
      {
        path: ':observedLocationId',
        runGuardsAndResolvers: 'pathParamsChange',
        data: {
          pathIdParam: 'observedLocationId'
        },
        children: [
          {
            path: '',
            pathMatch: 'full',
            component: ObservedLocationPage,
            runGuardsAndResolvers: 'pathParamsChange'
          },
          // {
          //   path: 'batches',
          //   component: SubBatchesModal,
          //   runGuardsAndResolvers: 'pathParamsChange'
          // },
          {
            path: 'landing/:landingId',
            runGuardsAndResolvers: 'pathParamsChange',
            data: {
              pathIdParam: 'landingId'
            },
            children: [
              {
                path: '',
                pathMatch: 'full',
                component: LandingPage,
                runGuardsAndResolvers: 'pathParamsChange'
              }
            ]
          },
          {
            path: 'control/:controlId',
            runGuardsAndResolvers: 'pathParamsChange',
            data: {
              pathIdParam: 'controlId'
            },
            children: [
              {
                path: '',
                pathMatch: 'full',
                component: AuctionControlPage,
                runGuardsAndResolvers: 'pathParamsChange'
              }
            ]
          },
          {
            path: 'trip/:tripId',
            runGuardsAndResolvers: 'pathParamsChange',
            data: {
              pathIdParam: 'tripId'
            },
            children: [
              {
                path: '',
                pathMatch: 'full',
                component: LandedTripPage,
                runGuardsAndResolvers: 'pathParamsChange'
              }
            ]
          }
        ]
      }
    ]
  },

  // Extraction path
  {
    path: 'extraction',
    canActivate: [AuthGuardService],
    loadChildren: () => import('./trip/extraction/extraction.module').then(m => m.ExtractionModule)
  },

  // Test module (disable in menu, by default - can be enable by the Pod configuration page)
  {
    path: 'testing',
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'shared',
      },
      // Shared module
      {
        path: 'shared',
        loadChildren: () => import('./shared/shared.testing.module').then(m => m.SharedTestingModule)
      },
      // Trip module
      {
        path: 'trip',
        loadChildren: () => import('./trip/trip.testing.module').then(m => m.TripTestingModule)
      }
    ]
  },

  // Other route redirection (should at the end of the array)
  {
    path: "**",
    redirectTo: '/'
  }
];


@Injectable()
export class CustomReuseStrategy extends IonicRouteStrategy {

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    const result = super.shouldReuseRoute(future, curr);

    // Force to reuse the route if path change from [/new] -> [/:id]
    if (!result && future.routeConfig && future.routeConfig === curr.routeConfig) {
      const pathIdParam = future.routeConfig.data && future.routeConfig.data.pathIdParam || 'id';
      const futureId = future.params[pathIdParam] === 'new' ?
        (future.queryParams[pathIdParam] || future.queryParams['id']) : future.params[pathIdParam];
      const currId = curr.params[pathIdParam] === 'new' ?
        (curr.queryParams[pathIdParam] || curr.queryParams['id']) : curr.params[pathIdParam];
      return futureId === currId;
    }

    return result;
  }
}

@NgModule({
  imports: [
    RouterModule.forRoot(routes, routeOptions)
  ],
  exports: [
    RouterModule
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: CustomReuseStrategy }
  ]
})
export class AppRoutingModule {
}
