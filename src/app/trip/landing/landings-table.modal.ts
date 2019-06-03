import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, ViewChild} from "@angular/core";
import {LandingsTable} from "./landings.table";
import {ModalController} from "@ionic/angular";
import {LandingFilter} from "../services/landing.service";
import {AcquisitionLevelType, isNotNil} from "../../referential/services/model";
import {TableElement} from "angular4-material-table";
import {Landing} from "../services/trip.model";

@Component({
  selector: 'app-landings-table-modal',
  templateUrl: './landings-table.modal.html',
  styleUrls: ['./landings-table.modal.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingsTablesModal implements OnInit {

  @ViewChild('table') table: LandingsTable;

  @Input() filter: LandingFilter = {};
  @Input() acquisitionLevel: AcquisitionLevelType;
  @Input() program: string;

  constructor(
    protected viewCtrl: ModalController,
    protected cd: ChangeDetectorRef
  ) {
    this.acquisitionLevel = 'LANDING'; // default value
  }

  ngOnInit() {
    this.table.filter = this.filter;
    this.table.program = this.program;
    this.table.acquisitionLevel = this.acquisitionLevel;
    setTimeout(() => {
      this.table.onRefresh.next("modal");
      this.markForCheck();
    }, 200);
  }


  selectRow({id, row}) {
    if (row) {
      this.table.selection.select(row);
      //this.close();
    }
  }

  async close(event?: any): Promise<boolean> {
    try {
      if (this.hasSelection()) {
        const json = this.table.selection.selected[0].currentData;
        this.viewCtrl.dismiss(Landing.fromObject(json));
      }
      return true;
    } catch (err) {
      // nothing to do
      return false;
    }
  }

  async cancel() {
    await this.viewCtrl.dismiss();
  }

  hasSelection(): boolean {
    return this.table.selection.hasValue() && this.table.selection.selected.length === 1;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
