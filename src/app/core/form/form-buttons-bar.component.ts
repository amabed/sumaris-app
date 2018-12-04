import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'form-buttons-bar',
    templateUrl: './form-buttons-bar.component.html',
    host: { '(window:keydown)': 'hotkeys($event)' },
    styleUrls: ['./form-buttons-bar.component.scss']
})
export class FormButtonsBarComponent {

    @Input()
    disabled: boolean = false;

    @Input()
    disabledCancel: boolean = false;

    @Output()
    onCancel: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

    @Output()
    onSave: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

    @Output()
    onNext: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

    @Output()
    onBack: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

    hotkeys(event) {
        // Ctrl+S 
        if (event.keyCode == 83 && event.ctrlKey) {
            if (!this.disabled) this.onSave.emit(event);
            event.preventDefault();
        }
        // Ctrl+Z 
        if (event.keyCode == 90 && event.ctrlKey) {
            if (!this.disabled && !this.disabledCancel) this.onCancel.emit(event);
            event.preventDefault();
        }
    }
}