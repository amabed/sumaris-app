import {Injectable} from "@angular/core";
import {DataEntityValidatorOptions} from "./base.validator";
import {FormArray, FormBuilder, FormGroup, Validators} from "@angular/forms";
import {toBoolean} from "../../../shared/functions";
import {SharedValidators} from "../../../shared/validator/validators";
import {LocalSettingsService} from "../../../core/services/local-settings.service";
import {AggregatedLanding, VesselActivity} from "../model/aggregated-landing.model";
import {ValidatorService} from "angular4-material-table";

export interface AggregatedLandingValidatorOptions extends DataEntityValidatorOptions {
  required?: boolean;
}

@Injectable()
export class AggregatedLandingValidatorService<T extends AggregatedLanding = AggregatedLanding, O extends AggregatedLandingValidatorOptions = AggregatedLandingValidatorOptions>
  implements ValidatorService {

  constructor(
    protected formBuilder: FormBuilder,
    protected settings: LocalSettingsService) {
  }

  getRowValidator(opts?: O) {
    return this.getFormGroup();
  }

  getFormGroup(data?: T, opts?: O): FormGroup {
    opts = this.fillDefaultOptions(opts);

    return this.formBuilder.group(
      this.getFormGroupConfig(data, opts),
      this.getFormGroupOptions(data, opts)
    );
  }

  getFormGroupConfig(data?: T, opts?: O): { [p: string]: any } {
    opts = this.fillDefaultOptions(opts);

    return {
      vesselSnapshot: [data && data.vesselSnapshot, Validators.compose([Validators.required, SharedValidators.entity])],
      vesselActivities: [data && data.vesselActivities || []]
    };
  }

  getFormGroupOptions(data?: T, opts?: O): {
    [key: string]: any;
  } {
    return {};
  }

  protected fillDefaultOptions(opts?: O): O {
    opts = opts || {} as O;

    opts.required = toBoolean(opts.required, true);

    return opts;
  }
}
