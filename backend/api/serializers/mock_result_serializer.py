from rest_framework import serializers

from apps.results.models import MockResult


class MockResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = MockResult
        fields = ["id", "student", "subject", "school_class", "mock", "year", "score", "created_at"]
        read_only_fields = ["id", "created_at"]