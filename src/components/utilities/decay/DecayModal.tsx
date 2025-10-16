import { Form, Input, InputNumber, Modal, Select } from 'antd';
import { ARK_MAPS, DEFAULT_ARK_MAP } from '../../../data/arkMaps';
import { STRUCTURE_TYPES } from '../../../data/structureTypes';
import { DAY_SECONDS } from './decayUtils';

const { TextArea } = Input;

interface DecayModalProps {
  translate: (key: string, fallback: string, values?: Record<string, unknown>) => string;
  form: any;
  open: boolean;
  selectedMapId: string;
  onCancel: () => void;
  onSubmit: () => void;
}

export default function DecayModal({ translate, form, open, selectedMapId, onCancel, onSubmit }: DecayModalProps) {
  const selectedMap = ARK_MAPS.find((map) => map.id === selectedMapId) ?? DEFAULT_ARK_MAP;

  return (
    <Modal
      title={translate('utilities.decay.modal.addTitle', 'Add Server')}
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      okText={translate('utilities.decay.modal.addButton', 'Add server')}
      destroyOnHidden
      style={{
        top: 40,
      }}
      maskClosable>
      <div className="decay-tool__map-preview">
        <img
          src={selectedMap.image}
          alt={selectedMap.name}
        />
      </div>
      <Form
        layout="vertical"
        form={form}
        initialValues={{
          mapId: DEFAULT_ARK_MAP.id,
          structureId: STRUCTURE_TYPES[0]?.id,
          note: '',
        }}>
        <Form.Item
          label={translate('utilities.decay.fields.map', 'Map')}
          name="mapId"
          rules={[{ required: true, message: translate('utilities.decay.validation.map', 'Select a map') }]}
          initialValue={DEFAULT_ARK_MAP.id}>
          <Select options={ARK_MAPS.map((map) => ({ value: map.id, label: map.name }))} />
        </Form.Item>

        <Form.Item
          label={translate('utilities.decay.fields.serverNumber', 'Server number')}
          name="serverNumber"
          rules={[
            { required: true, message: translate('utilities.decay.validation.server', 'Enter a server number') },
            {
              type: 'number',
              transform: (value) => (value == null ? value : Number(value)),
              min: 0,
              message: translate('utilities.decay.validation.serverPositive', 'Server number must be positive'),
            },
          ]}>
          <InputNumber
            className="decay-tool__input-number"
            placeholder={translate('utilities.decay.placeholders.serverNumber', 'Example: 1234')}
            controls={false}
          />
        </Form.Item>

        <Form.Item
          label={translate('utilities.decay.fields.structureType', 'Structure type')}
          name="structureId"
          rules={[{ required: true, message: translate('utilities.decay.validation.structure', 'Select structure type') }]}>
          <Select
            options={STRUCTURE_TYPES.map((structure) => ({
              value: structure.id,
              label: `${structure.name} (${Math.round(structure.decaySeconds / DAY_SECONDS)} ${translate('utilities.decay.labels.days', 'days')})`,
            }))}
          />
        </Form.Item>

        <Form.Item
          label={translate('utilities.decay.fields.note', 'Note')}
          name="note">
          <TextArea
            rows={3}
            placeholder={translate('utilities.decay.placeholders.note', 'Note what you have to render in this server, ex: Main base, water pen, etc')}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
