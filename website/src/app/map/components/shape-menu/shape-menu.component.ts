import {Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {MatMenu, MatMenuTrigger} from '@angular/material/menu';
import {
  CesiumEvent,
  MapEventsManagerService,
  EventRegistrationInput,
  PickOptions,
  MapsManagerService, Movement
} from 'angular-cesium';

export interface ShapeMenuEvent {
  itemIndex: number;
  shapeId: string;
  editableShape: any;
}

@Component({
  selector: 'app-shape-menu',
  templateUrl: './shape-menu.component.html',
  styleUrls: ['./shape-menu.component.css'],
  providers: [MapEventsManagerService]
})
export class ShapeMenuComponent implements OnInit {
  @Input() enabled = true;
  @Input() shapeType?: any;
  @Input() items: string[];
  @Input() selfTrigger = true;
  @ViewChild(MatMenuTrigger) trigger: MatMenuTrigger;
  @ViewChild('shapeMenuContainer') container: ElementRef;
  @ViewChild('shapeMenu') shapeMenu: MatMenu;
  @Output() itemClicked = new EventEmitter<ShapeMenuEvent>();


  private openEventRegistration: EventRegistrationInput;
  private lastPickedEntity: any;
  anchorPosition = {top: 0, left: 0};

  constructor(private managerService: MapsManagerService) {
  }

  ngOnInit(): void {
    if (this.selfTrigger) {
      this.openEventRegistration = {
        event: CesiumEvent.RIGHT_CLICK, // event type enum. [required!]
        entityType: this.shapeType, // raise event only if AcEntity is clicked. [optional]
        priority: 100,
        pick: PickOptions.PICK_FIRST // entity pick option, default PickOptions.NO_PICK. [optional]
      };

      // open event
      this.managerService.getMap().getMapEventsManager().register(this.openEventRegistration).subscribe((result) => {
        // The EventResult will contain:
        // movement(screen location of the event), entities(your entities) , primitives( cesium primitives, like label,billboard...)
        if (result.entities != null && result.entities.length > 0) {
          this.open(result.movement, result.entities[0]);
        }
      });
    }
  }

  open(movement: Movement, entity?: any): void {
    if (this.enabled) {
      this.anchorPosition.left = movement.endPosition.x;
      this.anchorPosition.top = movement.endPosition.y;
      this.lastPickedEntity = entity;
      this.container.nativeElement.click();
      this.container.nativeElement.focus();
    }
  }

  close(): void {
    this.trigger.closeMenu();
  }

  menuItemClicked(index: number): void {
    this.trigger.closeMenu();
    const event: ShapeMenuEvent = {
      itemIndex: index,
      shapeId: this.lastPickedEntity.id,
      editableShape: this.lastPickedEntity
    };
    this.itemClicked.emit(event);
    this.lastPickedEntity = null;
  }
}
