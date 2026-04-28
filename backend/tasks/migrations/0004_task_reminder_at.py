from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tasks", "0003_alter_routinetask_options_routinetask_order_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="task",
            name="reminder_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]