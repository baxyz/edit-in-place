import {
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { fromEvent, Observable, Subject, Subscription } from 'rxjs';
import { filter, switchMapTo, take, takeUntil } from 'rxjs/operators';
import { ViewModeDirective } from './directives/view-mode.directive';
import { EditModeDirective } from './directives/edit-mode.directive';
import { EDITABLE_CONFIG, EditableConfig } from './editable.config';
import { Mode } from './mode';

@Component({
  selector: 'editable',
  template: ` <ng-container *ngTemplateOutlet="currentView"></ng-container> `,
  styles: [':host {cursor: pointer;}'],
})
export class EditableComponent implements OnInit, OnDestroy {
  @Input() openBindingEvent = this.config.openBindingEvent || 'click';
  @Input() closeBindingEvent = this.config.closeBindingEvent || 'click';

  @Output() save: EventEmitter<void> = new EventEmitter<void>();
  @Output() cancel: EventEmitter<void> = new EventEmitter<void>();

  @ContentChild(ViewModeDirective) viewModeTpl: ViewModeDirective;
  @ContentChild(EditModeDirective) editModeTpl: EditModeDirective;

  @ViewChild('input') input: ElementRef;

  private mode: Mode = 'view';
  private readonly editMode: Subject<boolean> = new Subject<boolean>();
  private readonly editMode$: Observable<boolean> = this.editMode.asObservable();
  public viewHandler: Subscription;
  private destroy$: Subject<boolean> = new Subject<boolean>();

  constructor(private readonly el: ElementRef, @Inject(EDITABLE_CONFIG) readonly config: EditableConfig) {}

  public get currentView(): TemplateRef<any> {
    if (!this.viewModeTpl && !this.editModeTpl) {
      throw new Error('the viewMode and the editMode are missing');
    } else if (!this.viewModeTpl) {
      throw new Error('the viewMode is missing');
    } else if (!this.editModeTpl) {
      throw new Error('the editMode is missing');
    }
    return this.mode === 'view' ? this.viewModeTpl.tpl : this.editModeTpl.tpl;
  }

  private get element(): any {
    return this.el.nativeElement;
  }

  ngOnInit(): void {
    this.handleViewMode();
    this.handleEditMode();
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
  }

  private handleViewMode(): void {
    this.viewHandler = fromEvent(this.element, this.openBindingEvent)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.displayEdition();
      });
  }

  private handleEditMode(): void {
    const clickOutside$ = fromEvent(document, this.closeBindingEvent).pipe(
      filter(({ target }) => this.element.contains(target) === false),
      take(1)
    );

    this.editMode$.pipe(switchMapTo(clickOutside$), takeUntil(this.destroy$)).subscribe(() => this.saveEdition());
  }

  public displayEdition(group: boolean = false): void {
    this.mode = 'edit';
    if (!group) {
      this.editMode.next(true);
    }
  }

  public saveEdition(): void {
    this.save.next();
    this.mode = 'view';
  }

  public cancelEdition(): void {
    this.cancel.next();
    this.mode = 'view';
  }
}
